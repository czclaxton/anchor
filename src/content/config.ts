import { defineCollection, z } from 'astro:content'

const lessons = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subject: z.string(),
    unit: z.string().optional(),
    order: z.number(),
    analogy: z.string(),
    hook: z.string(),
  }),
})

export const collections = { lessons }
