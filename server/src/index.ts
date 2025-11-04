import { createApp } from './app'
import cors from 'cors'

const port = process.env.PORT ? Number(process.env.PORT) : 3001
const app = createApp()

app.use(cors())

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
