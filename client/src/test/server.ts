import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer()

export function useNameAvailability(available: boolean) {
  server.use(
    http.get('/api/players/check-name', ({ request }) => {
      const url = new URL(request.url)
      const name = url.searchParams.get('name') || ''
      if (!name) return HttpResponse.json({ available: false })
      return HttpResponse.json({ available })
    })
  )
}
