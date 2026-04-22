# Security Specification - Sunshyne Business Suite

## 1. Data Invariants
- Products: Non-negative stock levels, restricted to valid categories.
- Jobs: Must have a client and title.
- Admin: Only `vinayckelkar@gmail.com` and `write@sunshynegrafix.com` can perform destructive actions (delete) or modify sensitive financials (invoices).
- Verification: All write operations require verified emails.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. **Unauth Create**: Anonymous user creating a product.
2. **Spoof Admin**: Non-admin user trying to delete a job.
3. **Invalid Stock**: Negative stock level in product.
4. **ID Poisoning**: 200kb string as product ID.
5. **Ghost Field**: Adding `isVerified: true` to a product.
6. **Shadow Update**: Non-admin trying to mark an invoice as paid.
7. **PII Leak**: Non-owner Reading another user's private info.
8. **Email Spoof**: User with `vinayckelkar@gmail.com` but `email_verified: false` tries to write.
9. **State Shortcut**: Moving a job from `Pending` directly to `Cancelled` if that violates a defined workflow (though we'll keep it flexible for now, but strict on schema).
10. **Huge Title**: Product title with 10k characters.
11. **Orphan Job**: Creating a job with a malformed client name.
12. **System Bypass**: Modifying `createdAt` during an update.

## 3. Test Runner Checklist
- `vinayckelkar@gmail.com` can create products.
- Random user cannot create products.
- `write@sunshynegrafix.com` can delete jobs.
- Only admins can see `invoices`.
- All writes must match `request.time`.
