# API Documentation

## Base URL
- Development: `http://localhost:5000`
- Production: `https://api.yourdomain.com`

## Authentication

All endpoints except `/auth/*` require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Sign Up
**POST** `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": 1,
  "email": "user@example.com"
}
```

**Error (400):**
```json
{
  "error": "Email already exists"
}
```

---

### Login
**POST** `/api/auth/login`

Authenticate and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": 1,
  "email": "user@example.com"
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## Subscription Endpoints

### Get All Subscriptions
**GET** `/api/subscriptions`

Retrieve all subscriptions for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "Netflix",
    "cost": 15.99,
    "category": "Entertainment",
    "billing_date": 15,
    "website": "https://netflix.com",
    "status": "active",
    "trial_end_date": null,
    "last_used_date": null,
    "notes": "Shared with family",
    "created_at": "2024-03-01T10:30:00Z"
  },
  {
    "id": 2,
    "user_id": 1,
    "name": "Spotify",
    "cost": 11.99,
    "category": "Entertainment",
    "billing_date": 20,
    "website": "https://spotify.com",
    "status": "active",
    "trial_end_date": null,
    "last_used_date": "2024-03-15T08:45:00Z",
    "notes": null,
    "created_at": "2024-02-01T09:00:00Z"
  }
]
```

---

### Create Subscription
**POST** `/api/subscriptions`

Add a new subscription.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Netflix",
  "cost": 15.99,
  "category": "Entertainment",
  "billing_date": 15,
  "website": "https://netflix.com",
  "trial_end_date": null,
  "notes": "Premium plan"
}
```

**Response (201):**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "Netflix",
  "cost": 15.99,
  "category": "Entertainment",
  "billing_date": 15,
  "website": "https://netflix.com",
  "trial_end_date": null,
  "notes": "Premium plan"
}
```

---

### Update Subscription
**PUT** `/api/subscriptions/:id`

Update an existing subscription.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `id` - Subscription ID (integer)

**Request Body:**
```json
{
  "name": "Netflix Premium",
  "cost": 19.99,
  "category": "Entertainment",
  "billing_date": 15,
  "website": "https://netflix.com",
  "status": "active",
  "trial_end_date": null,
  "notes": "Upgraded to Premium"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Error (400):**
```json
{
  "error": "Not found"
}
```

---

### Delete Subscription
**DELETE** `/api/subscriptions/:id`

Remove a subscription.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` - Subscription ID (integer)

**Response (200):**
```json
{
  "success": true
}
```

**Error (400):**
```json
{
  "error": "Not found"
}
```

---

## Analytics Endpoints

### Get Analytics
**GET** `/api/analytics`

Get spending analytics for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "totalMonthly": 43.97,
  "totalYearly": 527.64,
  "byCategory": {
    "Entertainment": 27.98,
    "Software": 15.99,
    "Fitness": 0.00
  },
  "count": 3
}
```

---

## Error Handling

All errors return a JSON object with an `error` field:

```json
{
  "error": "Error message here"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized (invalid or missing token)
- `404` - Not found
- `500` - Server error

---

## Rate Limiting

Currently no rate limiting implemented. For production, consider adding:
- Rate limit: 100 requests per minute per IP
- Burst limit: 50 requests per 10 seconds

---

## Pagination

Not implemented in MVP. Consider adding for future versions:
```
GET /api/subscriptions?page=1&limit=10
```

---

## Filtering & Sorting

Future versions could support:
```
GET /api/subscriptions?category=Entertainment&status=active
GET /api/subscriptions?sortBy=cost&order=desc
```

---

## Example: Complete Flow

### 1. Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response: `{ "token": "abc123...", "userId": 1 }`

### 2. Add Subscription
```bash
curl -X POST http://localhost:5000/api/subscriptions \
  -H "Authorization: Bearer abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Netflix",
    "cost":15.99,
    "category":"Entertainment",
    "billing_date":15
  }'
```

### 3. Get All Subscriptions
```bash
curl http://localhost:5000/api/subscriptions \
  -H "Authorization: Bearer abc123..."
```

### 4. Get Analytics
```bash
curl http://localhost:5000/api/analytics \
  -H "Authorization: Bearer abc123..."
```

---

## Webhook Support

Future enhancement: webhook notifications for:
- Trial expiration
- Billing day reminder
- Unusual spending

---

## Version History

- **v1.0.0** (Current) - Initial MVP release
- **v2.0.0** (Planned) - Email alerts, CSV export, API integrations
- **v3.0.0** (Planned) - Mobile app, AI detection, family sharing

---

For more info, see [README.md](./README.md)
