import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'

type SellerEntry = {
  sellerId: string
  productUrl: string
}

async function getSellersForCard(cardName: string, editionName: string): Promise<Map<string, SellerEntry>> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  try {
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

    const allSellers = new Map<string, SellerEntry>()

    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      const listingUrl = `${baseUrl}?page=${pageNum}&Language=English`
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

      sellers.forEach(s => allSellers.set(s.name, {
        sellerId: s.sellerId,
        productUrl: baseUrl,
      }))
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
  const { cards } = await request.json()

  const sellerMaps = await Promise.all(
    cards.map((card: any) => getSellersForCard(card.name, card.edition))
  )

  sellerMaps.forEach((map, i) => {
    console.log(`Total sellers for card ${i + 1}:`, map.size)
  })

  const [first, ...rest] = sellerMaps
  const intersection = [...first.entries()].filter(([name]) =>
    rest.every(map => map.has(name))
  )

  const sellers = intersection.map(([name, entry]) => ({
    name,
    sellerId: entry.sellerId,
    storeUrl: `https://www.tcgplayer.com/search/magic/product?seller=${entry.sellerId}&productLineName=magic&view=grid`,
    cardLinks: cards.map((card: any, i: number) => ({
      name: card.name,
      edition: card.edition,
      url: `${sellerMaps[i].get(name)?.productUrl}?seller=${entry.sellerId}`,
    })),
  }))

  console.log('Sellers with all cards:', sellers)

  return NextResponse.json({ sellers })
}