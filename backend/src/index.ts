import fastify from 'fastify'
import cors from '@fastify/cors'
import * as dotenv from 'dotenv'
import path from 'path'
import { createProofRequest, verifyProofResponse } from './reclaimService'

// Configure environment variables (points properly to the root project .env)
dotenv.config({ path: path.resolve(__dirname, './../.env') })

// Initialize the Fastify server controller
const server = fastify()

// Register CORS so our Next.js frontend can interact directly with the backend API locally
server.register(cors, {
    origin: '*',
})

/**
 * Reclaim Protocol Endpoints
 * 
 * - `/request-config`: Called by the frontend to safely generate a Proof configuration using our protected APP_SECRET.
 * - `/verify-proof`: Called by the frontend immediately after the user verifies their data, allowing us to mathematically attest it.
 */
server.get('/request-config', createProofRequest)
server.post('/verify-proof', verifyProofResponse)


// Standard wellness check
server.get('/ping', async (request, reply) => {
    return 'pong\n'
})

// Boot the server!
server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`[Backend Fastify] Server listening securely at ${address}`)
})