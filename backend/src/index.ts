import fastify from 'fastify'
import cors from '@fastify/cors'
import * as dotenv from 'dotenv'
import path from 'path'
import { createProofRequest, verifyProofResponse } from './reclaimService'

// Load environment variables from the root .env file.
// This is necessary to access the RECLAIM_APP_ID and RECLAIM_APP_SECRET.
dotenv.config({ path: path.resolve(__dirname, './../.env') })

// Initialize the Fastify server.
// Fastify is used here as a lightweight and efficient web framework for the backend.
const server = fastify()

// Register CORS (Cross-Origin Resource Sharing).
// This configuration allows our Next.js frontend, which runs on a different port
// locally, to make HTTP requests to this backend API without being blocked by the browser.
server.register(cors, {
    origin: '*',
})

// Define the Reclaim Protocol Endpoints.
//
// /request-config: Called by the frontend to safely generate a Proof configuration.
// By doing this on the backend, we ensure the protected APP_SECRET is never exposed
// to the client-side application.
server.get('/request-config', createProofRequest)

// /verify-proof: Called by the frontend after the user completes the verification flow.
// This endpoint receives the generated proof and mathematically verifies its authenticity.
server.post('/verify-proof', verifyProofResponse)

// A simple health check endpoint to verify the server is running.
server.get('/ping', async (request, reply) => {
    return 'pong\n'
})

// Start the server and listen on port 8080.
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
server.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Backend server listening at ${address}`)
})