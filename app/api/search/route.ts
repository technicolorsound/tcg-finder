import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.length < 2) return NextResponse.json([])

  const response = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=names`,
    { headers: { 'User-Agent': 'tcg-finder/1.0' } }
  )

  if (!response.ok) return NextResponse.json([])

  const data = await response.json()

  const cards = data.data.map((card: any) => ({
    name: card.name,
  }))

  return NextResponse.json(cards)
}