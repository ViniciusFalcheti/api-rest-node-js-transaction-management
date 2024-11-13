/* eslint-disable prettier/prettier */
import { FastifyInstance } from 'fastify'
import { string, z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
    app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
      const { sessionId } = request.cookies

        const transactions = await knex('transactions').select('*').where('session_id', sessionId)
    
        return {
            transactions
        }
    })

    app.get('/summary', { preHandler: [checkSessionIdExists] }, async (request) => {
        const { sessionId } = request.cookies

        const summary = await knex('transactions').sum('amount', {as: 'amount'}).where('session_id', sessionId).first()
    
        return {
            summary
        }
    })

    app.get('/:id', { preHandler: [checkSessionIdExists] }, async (request) => {
        const { sessionId } = request.cookies 
      
        const getTransactionParamsSchema = z.object({
            id: string().uuid(),
        })

        const { id } = getTransactionParamsSchema.parse(request.params)
   
        const transaction = await knex('transactions').select('*').where('id', id).andWhere('session_id', sessionId).first()
    
        return {
            transaction
        }
    })

  app.post('/', { preHandler: [checkSessionIdExists] }, async (request, response) => {
    
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      response.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return response.status(201).send()
  })
}
