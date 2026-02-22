import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cardName = request.nextUrl.searchParams.get('name')

  if (!cardName) return NextResponse.json([])

  const response = await fetch(
    `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints&order=released`,
    { headers: { 'User-Agent': 'tcg-finder/1.0' } }
  )

  if (!response.ok) return NextResponse.json([])

  const data = await response.json()

  const editions = data.data.map((card: any) => ({
    edition: card.set_name,
    setCode: card.set,
    scryfallId: card.id,
    releasedAt: card.released_at,
  }))

  return NextResponse.json(editions)
}