'use client'

import { useState } from 'react'

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

type CardSlot = {
  id: number
  query: string
  results: string[]
  editions: Edition[]
  selected: SelectedCard
}

type CardLink = {
  name: string
  edition: string
  price: number
  url: string
}

type Seller = {
  name: string
  sellerId: string
  storeUrl: string
  cardLinks: CardLink[]
  total: number
}

let nextId = 3

export default function Home() {
  const [slots, setSlots] = useState<CardSlot[]>([
    { id: 1, query: '', results: [], editions: [], selected: null },
    { id: 2, query: '', results: [], editions: [], selected: null },
  ])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  function updateSlot(id: number, changes: Partial<CardSlot>) {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function addSlot() {
    setSlots(prev => [...prev, { id: nextId++, query: '', results: [], editions: [], selected: null }])
  }
function clearAll() {
  setSlots([
    { id: 1, query: '', results: [], editions: [], selected: null },
    { id: 2, query: '', results: [], editions: [], selected: null },
  ])
  setSellers([])
  setSearched(false)
}
  function removeSlot(id: number) {
    setSlots(prev => prev.filter(s => s.id !== id))
    setSellers([])
    setSearched(false)
  }



  async function pickName(id: number, name: string) {
    updateSlot(id, { query: name, results: [] })
    const res = await fetch(`/api/editions?name=${encodeURIComponent(name)}`)
    const data = await res.json()
    updateSlot(id, { editions: data })
  }

  function pickEdition(id: number, ed: Edition) {
    const slot = slots.find(s => s.id === id)
    if (!slot) return
    updateSlot(id, {
      selected: { name: slot.query, edition: ed.edition, setCode: ed.setCode },
      editions: [],
    })
  }

  function clearSlot(id: number) {
    updateSlot(id, { query: '', results: [], editions: [], selected: null })
    setSellers([])
    setSearched(false)
  }

  async function findSellers() {
    const selected = slots.map(s => s.selected).filter(Boolean)
    if (selected.length < 2) return

    setLoading(true)
    setSellers([])
    setSearched(false)

    const res = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: selected }),
    })

    const data = await res.json()
    setSellers(data.sellers)
    setSearched(true)
    setLoading(false)
  }

  const readyCount = slots.filter(s => s.selected).length
  const canSearch = readyCount >= 2 && !loading

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-12">

      <h1 className="text-4xl font-bold tracking-widest text-yellow-400 mb-2">TCG FINDER</h1>
      <p className="text-gray-500 text-sm mb-10">Find TCGplayer sellers who stock all the cards you need</p>

      <div className="w-full max-w-md flex flex-col gap-4">

        {slots.map((slot, index) => (
          <CardPicker
            key={slot.id}
            label={`Card ${index + 1}`}
            slot={slot}
            canRemove={slots.length > 2}
            onQueryChange={q => {
              updateSlot(slot.id, { query: q, results: [], editions: [], selected: null })
              setSellers([])
              setSearched(false)
              if (q.length < 2) return
              setTimeout(async () => {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
                const data = await res.json()
                updateSlot(slot.id, { results: data.slice(0, 8).map((c: any) => c.name) })
              }, 300)
            }}
            onPickName={name => pickName(slot.id, name)}
            onPickEdition={ed => pickEdition(slot.id, ed)}
            onClear={() => clearSlot(slot.id)}
            onRemove={() => removeSlot(slot.id)}
          />
        ))}

        <button
          onClick={addSlot}
          className="w-full py-2 rounded text-sm text-gray-500 border border-dashed border-gray-800 hover:border-gray-600 hover:text-gray-400 transition-colors"
        >
          + Add another card
        </button>
<button
  onClick={clearAll}
  className="w-full py-2 rounded text-sm text-gray-600 hover:text-red-400 border border-dashed border-gray-800 hover:border-red-400 transition-colors"
>
  Clear all
</button>
        <button
          onClick={findSellers}
          className="w-full bg-yellow-400 text-gray-950 font-bold text-sm tracking-widest uppercase rounded py-3 mt-2 disabled:opacity-40"
          disabled={!canSearch}
        >
          {loading ? 'Searching... (this takes a while)' : `Find Sellers with All ${readyCount} Cards`}
        </button>

        {/* Disclaimer */}
        {searched && (
          <p className="text-xs text-gray-600 text-center">
            Prices shown are the lowest available from each seller and may be in any condition. Shipping not included — buying from a single seller is likely the most cost-effective option.
          </p>
        )}

        {sellers.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-green-400 tracking-widest uppercase mb-3">
              {sellers.length} sellers have all cards — sorted by price
            </p>
            {sellers.map((seller, i) => (
              <div key={seller.name} className="py-3 border-b border-gray-800 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <span className="text-xs bg-yellow-400 text-gray-950 font-bold px-2 py-0.5 rounded">
                        BEST
                      </span>
                    )}
                    <span className="text-sm font-bold text-white">{seller.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-yellow-400">
                      ${seller.total.toFixed(2)}
                    </span>
                    <a
                      href={seller.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-yellow-400 transition-colors"
                    >
                      Store →
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {seller.cardLinks.map(link => (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex justify-between text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <span>{link.name} — {link.edition}</span>
                      <span>${link.price.toFixed(2)}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {sellers.length === 0 && searched && !loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center text-gray-500 text-sm">
            No sellers found with all cards. Try different editions.
          </div>
        )}

      </div>
    </main>
  )
}

function CardPicker({ label, slot, canRemove, onQueryChange, onPickName, onPickEdition, onClear, onRemove }: {
  label: string
  slot: CardSlot
  canRemove: boolean
  onQueryChange: (q: string) => void
  onPickName: (name: string) => void
  onPickEdition: (ed: Edition) => void
  onClear: () => void
  onRemove: () => void
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 relative">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-blue-400 tracking-widest uppercase">{label}</p>
        {canRemove && (
          <button onClick={onRemove} className="text-gray-700 hover:text-red-400 text-xs tracking-wide transition-colors">
            Remove
          </button>
        )}
      </div>

      {slot.selected ? (
        <div className="flex items-center justify-between bg-gray-950 border border-yellow-400/30 rounded px-3 py-2">
          <div>
            <p className="text-sm text-white">{slot.selected.name}</p>
            <p className="text-xs text-gray-500">{slot.selected.edition}</p>
          </div>
          <button onClick={onClear} className="text-gray-600 hover:text-red-400 text-lg ml-3">✕</button>
        </div>
      ) : (
        <>
          <input
            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
            placeholder="Card name..."
            value={slot.query}
            onChange={e => onQueryChange(e.target.value)}
          />

          {slot.results.length > 0 && (
            <div className="absolute left-4 right-4 bg-gray-900 border border-gray-700 rounded-lg mt-1 z-10 overflow-hidden">
              {slot.results.map(name => (
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

          {slot.editions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Pick an edition</p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                {slot.editions.map(ed => (
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