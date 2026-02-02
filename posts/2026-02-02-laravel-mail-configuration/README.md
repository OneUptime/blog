# How to Configure Mail in Laravel

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PHP, Laravel, Email, SMTP, Notifications

Description: Learn how to configure and send emails in Laravel using various mail drivers, Mailables, queued emails, and testing strategies.

---

Sending emails is something almost every web application needs to do - password resets, order confirmations, notifications, you name it. Laravel makes this surprisingly painless with its built-in mail system. In this post, I'll walk you through everything from basic setup to queued emails and testing.

## Understanding Laravel's Mail System

Laravel's mail system is built on top of SwiftMailer and provides a clean, expressive API for sending emails. The framework supports multiple drivers out of the box, so you can switch between SMTP, Mailgun, Postmark, Amazon SES, and others without changing your application code.

Here's a quick comparison of the available mail drivers:

| Driver | Best For | Pros | Cons |
|--------|----------|------|------|
| SMTP | Development, small apps | Universal, easy setup | Slower for bulk |
| Mailgun | Production apps | Great deliverability, API-based | Costs money at scale |
| Postmark | Transactional emails | Fast delivery, good analytics | Transactional only |
| Amazon SES | High volume | Very cheap, scalable | More setup required |
| Sendmail | Local servers | No external deps | Limited features |
| Log | Testing | See emails in logs | Not for production |

## Basic Mail Configuration

First, let's set up the mail configuration. Open your `.env` file and configure the mail settings:

```env
# Using SMTP (common for development with Mailtrap)
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username_here
MAIL_PASSWORD=your_password_here
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=hello@yourapp.com
MAIL_FROM_NAME="${APP_NAME}"
```

The configuration file at `config/mail.php` pulls these values and sets up the mailer. You typically don't need to modify this file unless you need custom mailers.

## Creating a Mailable Class

Laravel uses Mailable classes to represent emails. Each Mailable encapsulates everything about an email - its subject, recipients, view, and data. Let's create one:

```bash
php artisan make:mail OrderShipped
```

This creates a new Mailable at `app/Mail/OrderShipped.php`. Here's what a complete Mailable looks like:

```php
<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Attachment;

class OrderShipped extends Mailable
{
    use Queueable, SerializesModels;

    // Public properties are automatically available in the view
    public Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    // Define the email subject and sender
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Order Has Shipped!',
            replyTo: [
                'support@yourapp.com',
            ],
        );
    }

    // Define the view and any additional data
    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.shipped',
            with: [
                'orderUrl' => route('orders.show', $this->order),
                'trackingNumber' => $this->order->tracking_number,
            ],
        );
    }

    // Attach files to the email
    public function attachments(): array
    {
        return [
            // Attach a file from storage
            Attachment::fromStorage('/invoices/' . $this->order->invoice_path)
                ->as('invoice.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
```

Now create the corresponding Blade view at `resources/views/emails/orders/shipped.blade.php`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Order Shipped</title>
</head>
<body>
    <h1>Hello {{ $order->user->name }}!</h1>

    <p>Great news - your order #{{ $order->id }} has shipped!</p>

    <p><strong>Tracking Number:</strong> {{ $trackingNumber }}</p>

    <p>
        <a href="{{ $orderUrl }}">View your order details</a>
    </p>

    <p>Thanks for shopping with us!</p>
</body>
</html>
```

## Sending Emails

With your Mailable ready, sending an email is straightforward:

```php
<?php

use App\Mail\OrderShipped;
use Illuminate\Support\Facades\Mail;

// Send to a single recipient
Mail::to($user->email)->send(new OrderShipped($order));

// Send to multiple recipients with CC and BCC
Mail::to($user->email)
    ->cc($manager->email)
    ->bcc('records@yourapp.com')
    ->send(new OrderShipped($order));

// Send to a collection of users
Mail::to($users)->send(new OrderShipped($order));
```

## Queued Emails

Sending emails synchronously can slow down your application. For better performance, queue your emails:

```php
<?php

use App\Mail\OrderShipped;
use Illuminate\Support\Facades\Mail;

// Queue the email for background processing
Mail::to($user->email)->queue(new OrderShipped($order));

// Delay the email by 10 minutes
Mail::to($user->email)
    ->later(now()->addMinutes(10), new OrderShipped($order));
```

You can also make a Mailable always queued by implementing `ShouldQueue`:

```php
<?php

namespace App\Mail;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;

class OrderShipped extends Mailable implements ShouldQueue
{
    // This email will always be queued, even when using send()
}
```

Make sure you have a queue worker running:

```bash
php artisan queue:work
```

## Configuring Different Mail Drivers

### Mailgun Setup

For Mailgun, update your `.env`:

```env
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_SECRET=your-api-key
```

Install the Mailgun transport:

```bash
composer require symfony/mailgun-mailer symfony/http-client
```

### Amazon SES Setup

For SES, configure your AWS credentials:

```env
MAIL_MAILER=ses
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_DEFAULT_REGION=us-east-1
```

Install the SES transport:

```bash
composer require aws/aws-sdk-php
```

## Testing Emails with Mailtrap

Mailtrap is perfect for development - it catches all outgoing emails without actually delivering them. Sign up at mailtrap.io and grab your credentials:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
```

For automated testing, Laravel provides several assertion methods:

```php
<?php

namespace Tests\Feature;

use App\Mail\OrderShipped;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OrderTest extends TestCase
{
    public function test_order_shipped_email_is_sent()
    {
        // Prevent actual emails from being sent
        Mail::fake();

        // Perform the action that triggers the email
        $this->post('/orders/1/ship');

        // Assert the email was sent
        Mail::assertSent(OrderShipped::class, function ($mail) {
            return $mail->hasTo('customer@example.com')
                && $mail->order->id === 1;
        });

        // Assert email was queued (if using queue)
        Mail::assertQueued(OrderShipped::class);

        // Assert no emails were sent
        Mail::assertNothingSent();
    }
}
```

## Markdown Mailables

Laravel also supports Markdown emails with pre-built components:

```bash
php artisan make:mail OrderShipped --markdown=emails.orders.shipped
```

This creates a Markdown template:

```blade
<x-mail::message>
# Order Shipped

Your order has been shipped!

<x-mail::button :url="$orderUrl">
View Order
</x-mail::button>

<x-mail::table>
| Item | Quantity | Price |
|:-----|:--------:|------:|
@foreach($order->items as $item)
| {{ $item->name }} | {{ $item->quantity }} | ${{ $item->price }} |
@endforeach
</x-mail::table>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
```

You can publish and customize the Markdown components:

```bash
php artisan vendor:publish --tag=laravel-mail
```

## Common Gotchas

A few things that trip people up:

1. **Queue connection**: Make sure `QUEUE_CONNECTION` in your `.env` isn't set to `sync` if you want emails queued properly.

2. **From address**: Always set `MAIL_FROM_ADDRESS` - some mail drivers require it.

3. **TLS vs SSL**: Use port 587 with TLS or port 465 with SSL. Mixing them up causes connection failures.

4. **Serialization**: When queuing emails, the Mailable gets serialized. Make sure any objects you pass can be serialized (Eloquent models work great thanks to `SerializesModels`).

## Wrapping Up

Laravel's mail system handles most use cases out of the box. Start with SMTP and Mailtrap for development, then switch to a service like Mailgun or SES for production. Queue your emails whenever possible - your users will thank you for the faster response times.

The combination of Mailable classes, Blade templates, and queue support means you can build a robust email system without much overhead. Check out the [Laravel documentation](https://laravel.com/docs/mail) for more advanced features like custom transports and mail events.
