# Validation Summary: How to Use Laravel Cashier for Subscriptions

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- PHP 8.1+
- Laravel 10.x / 11.x
- Laravel Cashier (Stripe) v15
- Stripe API (Products, Prices, Subscriptions, Webhooks, Checkout, Customer Portal, Setup Intents, Coupons)
- Stripe.js / Stripe Elements (frontend)
- Stripe CLI (local webhook testing)

## Sources Consulted
- Laravel Cashier (Stripe) official docs: https://laravel.com/docs/11.x/billing
- Laravel Cashier source on GitHub (15.x branch): https://github.com/laravel/cashier-stripe
- Cashier 14 upgrade guide (rename of `cancelled()` → `canceled()`): https://github.com/laravel/cashier-stripe/blob/15.x/UPGRADE.md
- Cashier Stripe v13 release notes (introduction of `previewInvoice()`): https://laravel-news.com/laravel-cashier-stripe-v13-0-0
- Stripe API reference for Products, Prices, Subscriptions, PaymentIntents, SetupIntents

## Issues Found

1. **`cancelled()` → `canceled()` (3 occurrences)** — In Cashier 14+, the British-spelled `cancelled()` method on the `Subscription` model was renamed to `canceled()` (American spelling) to match Stripe's API. Since the post targets Laravel 10.x+ (which uses Cashier 14/15), the correct method name is `canceled()`. Fixed all three call sites and the corresponding JSON response keys (lines 857, 1122, 1245).

2. **`cancelNowAndInvoice()` mischaracterized as a refund** — The `cancelNowAndRefund` controller method, its docblock ("Cancel and refund prorated amount"), inline comment ("issue prorated refund"), and response message ("prorated amount refunded") all incorrectly described `cancelNowAndInvoice()` as issuing a refund. Per the official docs, this method cancels immediately and **invoices** any remaining un-invoiced metered usage or pending proration items — it does not refund. Renamed the method to `cancelNowAndInvoice`, updated the docblock/comment, and corrected the response message to "final invoice issued".

## Review Notes

- Verified API surface against Cashier 15.x: `Billable` trait, `createOrGetStripeCustomer()`, `updateDefaultPaymentMethod()`, `addPaymentMethod()`, `deletePaymentMethod()`, `paymentMethods()`, `defaultPaymentMethod()`, `createSetupIntent()`, `hasStripeId()`, `stripe()`, `redirectToBillingPortal()`, `billingPortalUrl()`, `invoices()`, `downloadInvoice()`, `upcomingInvoice()`, `subscribed()`, `onTrial()`, `onGenericTrial()`, `subscribedToPrice()`, `newSubscription()`, `checkout()`, `allowPromotionCodes()`, `withCoupon()`, `trialDays()`, `trialUntil()`, `skipTrial()`, `applyCoupon()`, `swap()`, `noProrate()->swap()`, `swapAndInvoice()`, `previewInvoice()`, `updateQuantity()`, `incrementQuantity()`, `decrementQuantity()`, `cancel()`, `cancelNow()`, `cancelNowAndInvoice()`, `resume()`, `onGracePeriod()`, `recurring()`, `ended()`, `asStripeSubscription()` — all confirmed.
- Verified migration column definitions (`stripe_id`, `pm_type`, `pm_last_four`, `trial_ends_at`, plus subscriptions and subscription_items tables) match the official Cashier 15 migrations.
- Webhook handler method naming (`handleInvoicePaymentSucceeded`, `handleInvoicePaymentFailed`, `handleCustomerSubscriptionDeleted`, `handleCustomerSubscriptionTrialWillEnd`, `handleChargeRefunded`) follows Cashier's `event.name` → `handleEventName` convention and is correct.
- `InvoiceLineItem` property access (`$item->description`, `$item->amount`, `$item->proration`) works through Cashier's `__get` magic method, which proxies to the underlying Stripe line item object — technically correct.
- The custom `subscribed` middleware uses `$user->subscribed($type)`, which checks by subscription **type** column (not price). The example route `subscribed:pro` would only match if a subscription was created with type `'pro'`, while the rest of the post consistently uses type `'default'`. Not an error, but readers should know the middleware param is a subscription type, not a plan name.
- The Stripe test card list, Stripe CLI install instructions, and dashboard URLs (`dashboard.stripe.com/products`, `dashboard.stripe.com/webhooks`, `dashboard.stripe.com/apikeys`) are all current and correct.
