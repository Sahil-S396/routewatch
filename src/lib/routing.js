/**
 * routing.js — Helper for Geocoding and OSRM Route fetching
 */

const geocodeCache = new Map()
const routeCache = new Map()

export async function getCoordinates(city) {
  const norm = city.trim().toLowerCase()
  if (geocodeCache.has(norm)) return geocodeCache.get(norm)

  try {
    // Nominatim Geocoding API
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', India')}&limit=1`)
    const data = await res.json()
    if (data && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      geocodeCache.set(norm, coords)
      return coords
    }
  } catch (err) {
    console.error('Failed to geocode:', city, err)
  }
  return null
}

export async function getRoutePath(start, end) {
  if (!start || !end) return null
  
  const cacheKey = `${start[0]},${start[1]}_${end[0]},${end[1]}`
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey)

  try {
    // OSRM Public API
    // Note: OSRM takes coordinates as Lng,Lat
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`)
    const data = await res.json()
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      // OSRM returns GeoJSON coordinates as [lng, lat]
      // Leaflet expects [lat, lng]
      const path = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]])
      routeCache.set(cacheKey, path)
      return path
    }
  } catch (err) {
    console.error('Failed to fetch route:', err)
  }
  return null
}
