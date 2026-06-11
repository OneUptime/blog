# Validation Summary: How to Create Custom DI Extensions in .NET

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- .NET dependency injection
- C#
- ASP.NET Core
- `IServiceCollection`
- Options pattern
- Options validation
- Hosted services
- MailKit SMTP

## Sources Consulted
- Microsoft Learn: Dependency injection in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection
- Microsoft Learn: Dependency injection in .NET service registration - https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-registration
- Microsoft Learn: Options pattern in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/options
- Microsoft Learn: `System.Net.Mail.SmtpClient` - https://learn.microsoft.com/en-us/dotnet/api/system.net.mail.smtpclient
- Microsoft Learn: `TryAddEnumerable` - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.extensions.servicecollectiondescriptorextensions.tryaddenumerable
- MailKit API docs: SMTP client methods - https://mimekit.net/docs/html/Methods_T_MailKit_Net_Smtp_SmtpClient.htm
- MailKit API docs: `ConnectAsync` - https://mimekit.net/docs/html/M_MailKit_Net_Smtp_SmtpClient_ConnectAsync_2.htm

## Issues Found
- The email service example used `System.Net.Mail.SmtpClient`, which Microsoft does not recommend for new development because it lacks support for many modern protocols. Updated the example to use MailKit and added the relevant MailKit namespaces.
- The payment builder example called `_services.Decorate<IPaymentService, RetryingPaymentService>()`, but `Decorate` is not part of the built-in Microsoft dependency injection APIs. Removed the call and adjusted the method comment so the built-in example only configures retry options.
- The options validation test comment said the exception would occur on service provider build. In the shown test, validation is triggered when `IOptions<OrderingOptions>.Value` is accessed. Updated the comment to match the actual behavior.
- The test snippet referenced `IOrderRepository` and xUnit attributes without the corresponding `using` statements. Added `using MyApp.Ordering.Repositories;` and `using Xunit;`.

## Review Notes
The post is technically sound after the corrections. `ValidateDataAnnotations` depends on the `Microsoft.Extensions.Options.DataAnnotations` package/assembly, which is available in typical ASP.NET Core app setups but should be kept in mind when adapting the snippets to a plain class library or console project.
