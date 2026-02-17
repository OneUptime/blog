# How to Implement Idempotent Cloud Functions to Handle Duplicate Event Deliveries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Idempotency, Reliability, Event-Driven

Description: Learn how to make Google Cloud Functions idempotent so they safely handle duplicate event deliveries from Pub/Sub, Cloud Storage, and Firestore triggers without side effects.

---

If you are building event-driven systems with Cloud Functions, you need to deal with a fundamental reality: events can be delivered more than once. Pub/Sub provides at-least-once delivery, which means your function might receive the same message twice, three times, or even more in rare cases. Cloud Storage and Firestore triggers can also produce duplicate events during retries or infrastructure hiccups.

If your function charges a customer, sends an email, or writes a database record, processing the same event twice would mean double charges, duplicate emails, or corrupted data. Idempotency is the solution - making your function produce the same result whether it processes an event once or ten times.

## What Makes a Function Idempotent?

A function is idempotent when calling it multiple times with the same input produces the same effect as calling it once. Here are some examples:

- Setting a value: `user.status = 'active'` - Idempotent (setting it twice has the same effect)
- Incrementing a counter: `user.loginCount += 1` - NOT idempotent (each call adds 1)
- Inserting with a unique key: `INSERT ... ON CONFLICT DO NOTHING` - Idempotent
- Sending an email: - NOT idempotent without deduplication logic

## Strategy 1: Event ID Deduplication

Every CloudEvent has a unique ID. Track which event IDs you have already processed:

```javascript
// index.js - Idempotent function using event ID tracking with Firestore
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore();
const processedCollection = firestore.collection('processed-events');

functions.cloudEvent('processOrder', async (cloudEvent) => {
  const eventId = cloudEvent.id;

  // Check if this event was already processed
  const docRef = processedCollection.doc(eventId);
  const doc = await docRef.get();

  if (doc.exists) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }

  // Decode the event data
  const message = cloudEvent.data.message;
  const orderData = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  );

  try {
    // Process the order (this is the part we want to happen exactly once)
    await chargeCustomer(orderData.customerId, orderData.amount);
    await sendConfirmationEmail(orderData.email, orderData.orderId);
    await updateInventory(orderData.items);

    // Mark the event as processed AFTER successful processing
    await docRef.set({
      processedAt: new Date(),
      orderId: orderData.orderId,
      status: 'completed'
    });

    console.log(`Successfully processed order ${orderData.orderId}`);
  } catch (error) {
    // Do NOT mark as processed if there was an error
    // This allows the retry to process it again
    console.error(`Failed to process order ${orderData.orderId}:`, error);
    throw error; // Trigger retry
  }
});
```

There is a subtle race condition here: two instances of the same function could check for the event ID simultaneously, both see it as unprocessed, and both start processing. To handle this, use a Firestore transaction:

```javascript
// Race-condition-safe deduplication with Firestore transactions
async function processOnce(eventId, processingFn) {
  const docRef = processedCollection.doc(eventId);

  try {
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (doc.exists) {
        console.log(`Event ${eventId} already processed (in transaction)`);
        return; // Exit the transaction without doing anything
      }

      // Mark as "in progress" within the transaction
      transaction.set(docRef, {
        status: 'processing',
        startedAt: new Date()
      });
    });

    // If we get here, we won the race and should process the event
    await processingFn();

    // Update status to completed
    await docRef.update({
      status: 'completed',
      completedAt: new Date()
    });
  } catch (error) {
    // Clean up the in-progress marker on failure
    await docRef.delete().catch(() => {});
    throw error;
  }
}
```

## Strategy 2: Natural Idempotency Keys

Sometimes the event data itself contains a natural key you can use for deduplication, which is more meaningful than the event ID:

```javascript
// Using the order ID as a natural idempotency key
functions.cloudEvent('processPayment', async (cloudEvent) => {
  const message = cloudEvent.data.message;
  const paymentData = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  );

  const orderId = paymentData.orderId;

  // Check if this order was already paid
  const orderRef = firestore.collection('orders').doc(orderId);
  const order = await orderRef.get();

  if (order.exists && order.data().paymentStatus === 'completed') {
    console.log(`Order ${orderId} already paid, skipping`);
    return;
  }

  // Process the payment
  const paymentResult = await processPayment(paymentData);

  // Update the order with payment info using a conditional update
  await orderRef.set({
    paymentStatus: 'completed',
    paymentId: paymentResult.id,
    paidAt: new Date(),
    amount: paymentData.amount
  }, { merge: true });
});
```

## Strategy 3: Database-Level Idempotency

For SQL databases, use UPSERT operations or unique constraints:

```javascript
// PostgreSQL upsert for idempotent writes
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

functions.cloudEvent('syncUser', async (cloudEvent) => {
  const userData = cloudEvent.data;

  // UPSERT: Insert if new, update if exists
  // This is naturally idempotent because running it twice
  // with the same data produces the same result
  await pool.query(`
    INSERT INTO users (id, email, name, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      updated_at = NOW()
  `, [userData.userId, userData.email, userData.name]);

  console.log(`User ${userData.userId} synced`);
});
```

For counter updates, use conditional increments:

```javascript
// Idempotent counter update using event tracking
functions.cloudEvent('trackPageView', async (cloudEvent) => {
  const eventId = cloudEvent.id;
  const pageData = cloudEvent.data;

  // Use a single atomic operation that checks and updates
  const result = await pool.query(`
    WITH inserted AS (
      INSERT INTO processed_events (event_id, processed_at)
      VALUES ($1, NOW())
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    )
    UPDATE page_stats
    SET view_count = view_count + 1
    WHERE page_id = $2
      AND EXISTS (SELECT 1 FROM inserted)
    RETURNING view_count
  `, [eventId, pageData.pageId]);

  if (result.rows.length > 0) {
    console.log(`Page view counted: ${result.rows[0].view_count}`);
  } else {
    console.log(`Duplicate event ${eventId}, view not counted again`);
  }
});
```

## Strategy 4: Idempotent External API Calls

When calling external APIs, pass an idempotency key if the API supports it:

```javascript
// Stripe supports idempotency keys natively
const stripe = require('stripe')(process.env.STRIPE_KEY);

functions.cloudEvent('chargeCustomer', async (cloudEvent) => {
  const eventId = cloudEvent.id;
  const chargeData = JSON.parse(
    Buffer.from(cloudEvent.data.message.data, 'base64').toString()
  );

  // Use the event ID as the Stripe idempotency key
  // Stripe will return the same result for duplicate requests
  const charge = await stripe.charges.create({
    amount: chargeData.amount,
    currency: 'usd',
    customer: chargeData.customerId,
    description: `Order ${chargeData.orderId}`
  }, {
    idempotencyKey: eventId  // Stripe handles deduplication for us
  });

  console.log(`Charge created: ${charge.id}`);
});
```

## Strategy 5: Idempotent Email Sending

For sending emails, track what has been sent:

```javascript
// Prevent duplicate email sends
async function sendEmailOnce(recipientEmail, templateId, eventId) {
  const sentEmailRef = firestore.collection('sent-emails').doc(
    `${recipientEmail}-${templateId}-${eventId}`
  );

  const sentEmail = await sentEmailRef.get();
  if (sentEmail.exists) {
    console.log(`Email already sent for event ${eventId}`);
    return;
  }

  // Send the email
  await emailService.send({
    to: recipientEmail,
    template: templateId,
    data: { /* template data */ }
  });

  // Record that the email was sent
  await sentEmailRef.set({
    sentAt: new Date(),
    recipientEmail,
    templateId,
    eventId
  });
}
```

## Cleanup: TTL for Processed Events

The processed events collection will grow indefinitely. Set up a TTL (time-to-live) to clean up old records:

```javascript
// Cloud Scheduler triggered function to clean up old processed events
functions.http('cleanupProcessedEvents', async (req, res) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7); // Keep records for 7 days

  const snapshot = await firestore
    .collection('processed-events')
    .where('processedAt', '<', cutoff)
    .limit(500)
    .get();

  const batch = firestore.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Cleaned up ${snapshot.size} old processed events`);
  res.json({ deleted: snapshot.size });
});
```

If you use Firestore, you can also configure TTL policies directly on the collection to automatically delete documents after a certain age.

## Testing Idempotency

Write tests that verify your function handles duplicates correctly:

```javascript
// test/idempotency.test.js
describe('processOrder', () => {
  it('should process the same event only once', async () => {
    const event = createMockCloudEvent({
      id: 'test-event-123',
      data: { orderId: 'order-1', amount: 100 }
    });

    // Process the event twice
    await processOrder(event);
    await processOrder(event);

    // Verify the order was only charged once
    const charges = await getChargesForOrder('order-1');
    expect(charges).toHaveLength(1);
    expect(charges[0].amount).toBe(100);
  });
});
```

## Monitoring

Monitor your deduplication rate with OneUptime. Track how often duplicate events are detected and skipped. A suddenly high deduplication rate might indicate a problem with your upstream event source, while zero deduplication might mean your tracking is not working correctly. Either way, visibility into this metric helps you understand the health of your event processing pipeline.

Idempotency is not optional for production event-driven systems. It is a fundamental requirement. Start with the simplest strategy that works for your use case, and build from there.
