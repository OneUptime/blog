# Validation Summary: How to Build a Notification Service in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET CLI
- ASP.NET Core Web API
- C#
- MailKit and MimeKit
- Twilio Programmable Messaging
- Firebase Admin SDK for .NET and Firebase Cloud Messaging
- Scriban templates
- In-memory rate limiting

## Sources Consulted
- Microsoft Learn: dotnet new - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new
- Microsoft Learn: dotnet package add / dotnet add package - https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- MailKit API reference: SmtpClient.ConnectAsync with SecureSocketOptions - https://mimekit.net/docs/html/M_MailKit_Net_Smtp_SmtpClient_ConnectAsync_2.htm
- MailKit API reference: SecureSocketOptions - https://mimekit.net/docs/html/T_MailKit_Security_SecureSocketOptions.htm
- Twilio Messaging API: Message resource statuses - https://www.twilio.com/docs/messaging/api/message-resource
- Twilio C# helper library source: MessageResource status enum and CreateAsync - https://github.com/twilio/twilio-csharp/blob/main/src/Twilio/Rest/Api/V2010/Account/MessageResource.cs
- Firebase Admin SDK setup guide - https://firebase.google.com/docs/admin/setup
- Firebase Admin .NET API reference: FirebaseApp - https://firebase.google.com/docs/reference/admin/dotnet/class/firebase-admin/firebase-app
- Firebase Admin .NET API reference: FirebaseMessaging.SendAsync - https://firebase.google.com/docs/reference/admin/dotnet/class/firebase-admin/messaging/firebase-messaging
- Firebase Admin .NET API reference: AndroidConfig - https://firebase.google.com/docs/reference/admin/dotnet/class/firebase-admin/messaging/android-config
- Firebase Admin .NET API reference: Aps - https://firebase.google.com/docs/reference/admin/dotnet/class/firebase-admin/messaging/aps
- Firebase Admin .NET API reference: MessagingErrorCode - https://firebase.google.com/docs/reference/admin/dotnet/namespace/firebase-admin/messaging
- Scriban documentation: runtime API - https://scriban.github.io/docs/
- Scriban package documentation - https://www.nuget.org/packages/scriban

## Issues Found
- The email example used `SmtpClient.ConnectAsync(host, port, useSsl)` with `UseSsl = true` and port `587`. In MailKit, the boolean overload enables SSL-on-connect, while port 587 commonly uses STARTTLS. Updated the snippet to import `MailKit.Security` and use `SecureSocketOptions.StartTls` through a `UseStartTls` setting.
- The project setup installed `StackExchange.Redis`, but the article's rate limiter implementation is in-memory and does not use Redis. Removed the unused package from the required setup commands.
- The Twilio status mapper omitted several current `MessageResource.StatusEnum` values such as `Sending`, `Accepted`, `Scheduled`, `Read`, `PartiallyDelivered`, and `Canceled`. Expanded the mapper so recognized Twilio statuses are handled explicitly.

## Review Notes
The local environment does not have the .NET SDK installed, so CLI commands and C# snippets could not be compiled or run locally. They were reviewed against official Microsoft, MailKit, Twilio, Firebase, and Scriban documentation instead. The sample remains intentionally partial: repository interfaces, user contact models, DI registration, persistence, queue integration, scheduled delivery, provider webhooks, and distributed rate limiting would still need concrete implementations for a production service.
