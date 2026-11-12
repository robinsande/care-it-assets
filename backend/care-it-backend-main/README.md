# care-it-backend

## Password reset email setup

Configure these environment variables in Render for Brevo email delivery:

- `BREVO_API_KEY`: Brevo API key with transactional email access.
- `BREVO_SENDER_EMAIL`: a sender email verified in Brevo.
- `BREVO_SENDER_NAME`: optional sender name, such as `CARE IT Asset Management`.

The password-reset OTP uses Brevo's `POST /v3/smtp/email` API. Do not commit the API key or any email password to the repository.

## Consumable stock utility

The Utilities page tracks the 2026 consumable catalogue from the stock workbook, including opening balances and monthly received/issued quantities. The backend seeds missing catalogue entries without overwriting existing stock data.

- `GET /api/consumables?year=2026` returns the catalogue and movements through the requested year.
- `POST /api/consumables` and `PUT /api/consumables/:id` manage catalogue items (admins only).
- `POST /api/consumables/:id/stock` records monthly received and issued quantities (users and admins).

Issued quantities are rejected if they would make the closing stock negative. Viewers can see stock but cannot record movements.