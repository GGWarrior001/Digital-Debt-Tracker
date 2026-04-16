const { z } = require('zod');

const VALID_CATEGORIES = [
  'Entertainment', 'Software', 'Fitness', 'News',
  'Productivity', 'Education', 'Finance', 'Other'
];

const signupSchema = z.object({
  email:    z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
});

const loginSchema = z.object({
  email:    z.string().email().trim().toLowerCase(),
  password: z.string().min(1)
});

const subscriptionSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(100).trim(),
  cost:           z.number().min(0, 'Cost must be non-negative').max(100000),
  category:       z.enum(VALID_CATEGORIES).optional().default('Other'),
  billing_cycle:  z.enum(['monthly', 'yearly', 'weekly']).optional().default('monthly'),
  billing_date:   z.number().int().min(1).max(31).optional().nullable(),
  website:        z.string().url().optional().nullable().or(z.literal('')),
  status:         z.enum(['active', 'paused', 'cancelled']).optional().default('active'),
  trial_end_date: z.string().optional().nullable(),
  last_used_date: z.string().optional().nullable(),
  notes:          z.string().max(500).optional().nullable()
});

module.exports = { signupSchema, loginSchema, subscriptionSchema, VALID_CATEGORIES };
