const BASE = '/api'

export async function fetchFacilities(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params)
  const res = await fetch(`${BASE}/facilities?${q}`)
  return res.json()
}

export async function fetchHazard(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params)
  const res = await fetch(`${BASE}/hazard?${q}`)
  return res.json()
}

export async function fetchRoads(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params)
  const res = await fetch(`${BASE}/roads?${q}`)
  return res.json()
}

export async function fetchProperties(params: Record<string, string> = {}) {
  const q = new URLSearchParams(params)
  const res = await fetch(`${BASE}/properties?${q}`)
  return res.json()
}

export async function createProperty(body: object) {
  const res = await fetch(`${BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function chat(message: string, appContext: string, mapBbox: number[] | null) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      app_context: appContext,
      map_bbox: mapBbox,
      request_id: crypto.randomUUID(),
    }),
  })
  return res.json()
}
