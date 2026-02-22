import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

async function getSellersForCard(cardName: string, editionName: string, language: string): Promise<Map<string, string>> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  try {
    // Step 1 — find the right product URL
    const searchUrl = `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodeURIComponent(cardName)}&view=grid`
    await page.goto(searchUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    const products = await page.$$eval('a[href*="/product/"]', els =>
      els.map(el => ({
        href: (el as HTMLAnchorElement).href,
        text: el.textContent?.trim() ?? '',
      }))
    )

    const match = products.find(p =>
      p.text.toLowerCase().includes(editionName.toLowerCase()) ||
      p.href.toLowerCase().includes(editionName.toLowerCase().replace(/\s+/g, '-'))
    )

    if (!match) {
      console.log('No matching product found for:', editionName)
      return new Map()
    }

    const baseUrl = match.href.split('?')[0]
    console.log('Found product URL:', baseUrl)

    const allSellers = new Map<string, string>()

    // Step 2 — scrape up to 10 pages
    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      const langParam = language === 'English' ? '&Language=English' : ''
      const listingUrl = `${baseUrl}?page=${pageNum}${langParam}`
      await page.goto(listingUrl, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)

      const sellers = await page.$$eval('a.seller-info__name', els =>
        els.map(el => {
          const href = (el as HTMLAnchorElement).href
          const parts = href.split('/')
          const sellerId = parts[parts.length - 1]
          const name = el.textContent?.trim() ?? ''
          return { name, sellerId }
        }).filter(s => s.name && s.sellerId)
      )

      if (sellers.length === 0) {
        console.log(`No sellers on page ${pageNum}, stopping`)
        break
      }

      sellers.forEach(s => allSellers.set(s.name, s.sellerId))
      console.log(`Page ${pageNum}: found ${sellers.length} sellers (total so far: ${allSellers.size})`)
    }

    return allSellers

  } catch (e) {
    console.log('Error:', e)
    return new Map()
  } finally {
    await browser.close()
  }
}

export async function POST(request: NextRequest) {
  const { cardA, cardB, language } = await request.json()

  const [sellersA, sellersB] = await Promise.all([
    getSellersForCard(cardA.name, cardA.edition, language),
    getSellersForCard(cardB.name, cardB.edition, language),
  ])

  console.log('Total sellers for A:', sellersA.size)
  console.log('Total sellers for B:', sellersB.size)

  const both = [...sellersA.entries()]
    .filter(([name]) => sellersB.has(name))
    .map(([name, sellerId]) => ({
      name,
      sellerId,
      url: `https://www.tcgplayer.com/search/magic/product?seller=${sellerId}&productLineName=magic&view=grid`,
    }))

  console.log('Sellers with both:', both)

  return NextResponse.json({ sellers: both })
}