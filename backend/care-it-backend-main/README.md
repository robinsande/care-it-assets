# care-it-backend

## Render environment

Set `JWT_EXPIRE=30d` in the deployed backend environment so authenticated sessions survive up to thirty days. A deliberate sign out still clears the browser session immediately.

## Consumable stock utility

The Utilities workspace tracks the 2026 stock workbook's opening balances and monthly receipts/issues. The catalogue seeds missing entries at startup without replacing saved stock data. Users and admins may record stock movements; only admins can edit the catalogue. An issue that would result in negative stock is rejected.

## Password reset email setup

Configure these environment variables in Render for Brevo email delivery:

- `BREVO_API_KEY`: Brevo API key with transactional email access.
- `BREVO_SENDER_EMAIL`: a sender email verified in Brevo.
- `BREVO_SENDER_NAME`: optional sender name, such as `CARE IT Asset Management`.

The password-reset OTP uses Brevo's `POST /v3/smtp/email` API. Do not commit the API key or any email password to the repository.