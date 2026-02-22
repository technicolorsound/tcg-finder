'use client'

import { useState, useEffect } from 'react'

type Edition = {
  edition: string
  setCode: string
  scryfallId: string
}

type SelectedCard = {
  name: string
  edition: string
  setCode: string
} | null

type Seller = {
  name: string
  sellerId: string
  url: string
}

export default function Home() {
  const [queryA, setQueryA] = useState('')
  const [queryB, setQueryB] = useState('')
  const [resultsA, setResultsA] = useState<string[]>([])
  const [resultsB, setResultsB] = useState<string[]>([])
  const [editionsA, setEditionsA] = useState<Edition[]>([])
  const [editionsB, setEditionsB] = useState<Edition[]>([])
  const [selectedA, setSelectedA] = useState<SelectedCard>(null)
  const [selectedB, setSelectedB] = useState<SelectedCard>(null)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [language, setLanguage] = useState<'English' | 'Any'>('English')

  useEffect(() => {
    if (selectedA || queryA.length < 2) return setResultsA([])
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryA)}`)
      const data = await res.json()
      setResultsA(data.slice(0, 8).map((c: any) => c.name))
    }, 300)
    return () => clearTimeout(timer)
  }, [queryA])

  useEffect(() => {
    if (selectedB || queryB.length < 2) return setResultsB([])
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryB)}`)
      const data = await res.json()
      setResultsB(data.slice(0, 8).map((c: any) => c.name))
    }, 300)
    return () => clearTimeout(timer)
  }, [queryB])

  async function pickName(name: string, slot: 'A' | 'B') {
    if (slot === 'A') { setQueryA(name); setResultsA([]) }
    else { setQueryB(name); setResultsB([]) }

    const res = await fetch(`/api/editions?name=${encodeURIComponent(name)}`)
    const data = await res.json()

    if (slot === 'A') setEditionsA(data)
    else setEditionsB(data)
  }

  function pickEdition(slot: 'A' | 'B', ed: Edition) {
    const name = slot === 'A' ? queryA : queryB
    const selected = { name, edition: ed.edition, setCode: ed.setCode }
    if (slot === 'A') { setSelectedA(selected); setEditionsA([]) }
    else { setSelectedB(selected); setEditionsB([]) }
  }

  function clearCard(slot: 'A' | 'B') {
    if (slot === 'A') {
      setSelectedA(null); setQueryA(''); setResultsA([]); setEditionsA([])
    } else {
      setSelectedB(null); setQueryB(''); setResultsB([]); setEditionsB([])
    }
    setSellers([])
    setSearched(false)
  }

  async function findSellers() {
    if (!selectedA || !selectedB) return
    setLoading(true)
    setSellers([])
    setSearched(false)

    const res = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardA: selectedA, cardB: selectedB, language }),
    })

    const data = await res.json()
    setSellers(data.sellers)
    setSearched(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">

      <h1 className="text-4xl font-bold tracking-widest text-yellow-400 mb-2">TCG FINDER</h1>
      <p className="text-gray-500 text-sm mb-10">Find TCGplayer sellers who stock both cards you need</p>

      <div className="w-full max-w-md flex flex-col gap-4">

        <CardPicker
          label="Card A"
          query={queryA}
          setQuery={setQueryA}
          results={resultsA}
          editions={editionsA}
          selected={selectedA}
          onPickName={name => pickName(name, 'A')}
          onPickEdition={ed => pickEdition('A', ed)}
          onClear={() => clearCard('A')}
        />

        <CardPicker
          label="Card B"
          query={queryB}
          setQuery={setQueryB}
          results={resultsB}
          editions={editionsB}
          selected={selectedB}
          onPickName={name => pickName(name, 'B')}
          onPickEdition={ed => pickEdition('B', ed)}
          onClear={() => clearCard('B')}
        />

       

        <button
          onClick={findSellers}
          className="w-full bg-yellow-400 text-gray-950 font-bold text-sm tracking-widest uppercase rounded py-3 mt-2 disabled:opacity-40"
          disabled={!selectedA || !selectedB || loading}
        >
          {loading ? 'Searching... (this takes ~2 min)' : 'Find Sellers with Both'}
        </button>

        {sellers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-green-400 tracking-widest uppercase mb-3">
              {sellers.length} sellers have both cards
            </p>
            {sellers.map(seller => (
              <a
                key={seller.name}
                href={seller.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0 text-sm text-white hover:text-yellow-400 transition-colors"
              >
                <span>{seller.name}</span>
                <span className="text-gray-600 text-xs">View store →</span>
              </a>
            ))}
          </div>
        )}

        {sellers.length === 0 && searched && !loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center text-gray-500 text-sm">
            No sellers found with both cards. Try different editions.
          </div>
        )}

      </div>
    </main>
  )
}

function CardPicker({ label, query, setQuery, results, editions, selected, onPickName, onPickEdition, onClear }: {
  label: string
  query: string
  setQuery: (v: string) => void
  results: string[]
  editions: Edition[]
  selected: SelectedCard
  onPickName: (name: string) => void
  onPickEdition: (ed: Edition) => void
  onClear: () => void
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative">
      <p className="text-xs text-blue-400 tracking-widest uppercase mb-3">{label}</p>

      {selected ? (
        <div className="flex items-center justify-between bg-gray-950 border border-yellow-400/30 rounded px-3 py-2">
          <div>
            <p className="text-sm text-white">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.edition}</p>
          </div>
          <button onClick={onClear} className="text-gray-600 hover:text-red-400 text-lg ml-3">✕</button>
        </div>
      ) : (
        <>
          <input
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
            placeholder="Card name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          {results.length > 0 && (
            <div className="absolute left-4 right-4 bg-gray-900 border border-gray-700 rounded-lg mt-1 z-10 overflow-hidden">
              {results.map(name => (
                <button
                  key={name}
                  onClick={() => onPickName(name)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 border-b border-gray-800 last:border-0 text-sm text-white"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {editions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Pick an edition</p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                {editions.map(ed => (
                  <button
                    key={ed.scryfallId}
                    onClick={() => onPickEdition(ed)}
                    className="w-full text-left px-3 py-2 bg-gray-950 hover:bg-gray-800 border border-gray-800 rounded text-sm text-white"
                  >
                    {ed.edition}
                    <span className="text-gray-600 text-xs ml-2 uppercase">{ed.setCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}