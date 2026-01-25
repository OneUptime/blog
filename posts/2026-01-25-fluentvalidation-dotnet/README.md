# How to Validate Requests with FluentValidation in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, FluentValidation, Validation, ASP.NET Core

Description: Learn how to implement request validation in .NET using FluentValidation. This guide covers basic validators, custom rules, conditional validation, and automatic integration with ASP.NET Core's model binding pipeline.

---

Request validation is one of those things that seems simple until you need complex rules: conditional validation, cross-field dependencies, async checks against a database, or custom error messages. FluentValidation provides a clean, fluent API for building validators that handle all these scenarios without cluttering your controllers or models with attributes.

## Why FluentValidation?

| Feature | Data Annotations | FluentValidation |
|---------|-----------------|------------------|
| Simple rules | Good | Good |
| Complex conditions | Limited | Excellent |
| Cross-field validation | Difficult | Easy |
| Async validation | Not supported | Built-in |
| Testability | Hard | Easy |
| Reusable rules | Limited | First-class |

## Getting Started

Install the NuGet packages:

```bash
dotnet add package FluentValidation
dotnet add package FluentValidation.AspNetCore
```

Register FluentValidation in `Program.cs`:

```csharp
using FluentValidation;

var builder = WebApplication.CreateBuilder(args);

// Register all validators from the assembly
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Add controllers with automatic validation
builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();
app.Run();
```

## Basic Validator Example

Create a request model and its validator:

```csharp
// The request model
public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int Age { get; set; }
}

// The validator
public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        // Email validation
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(256).WithMessage("Email cannot exceed 256 characters");

        // Password validation
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit")
            .Matches("[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character");

        // Confirm password must match
        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Passwords do not match");

        // Name validation
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100).WithMessage("First name cannot exceed 100 characters");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters");

        // Age validation
        RuleFor(x => x.Age)
            .InclusiveBetween(18, 120).WithMessage("Age must be between 18 and 120");
    }
}
```

## Using Validators in Controllers

### Manual Validation

Inject the validator and call it explicitly:

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IValidator<CreateUserRequest> _validator;
    private readonly IUserService _userService;

    public UsersController(
        IValidator<CreateUserRequest> validator,
        IUserService userService)
    {
        _validator = validator;
        _userService = userService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        // Validate the request
        var validationResult = await _validator.ValidateAsync(request);

        if (!validationResult.IsValid)
        {
            // Return validation errors
            return BadRequest(new
            {
                Errors = validationResult.Errors.Select(e => new
                {
                    Field = e.PropertyName,
                    Message = e.ErrorMessage
                })
            });
        }

        // Proceed with creating the user
        var user = await _userService.CreateUserAsync(request);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _userService.GetUserAsync(id);
        return user != null ? Ok(user) : NotFound();
    }
}
```

### Automatic Validation with Filter

Create a validation filter for automatic handling:

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class ValidationFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        // Get the service provider
        var serviceProvider = context.HttpContext.RequestServices;

        // Validate each action argument
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument == null) continue;

            var argumentType = argument.GetType();
            var validatorType = typeof(IValidator<>).MakeGenericType(argumentType);

            // Try to get a validator for this type
            var validator = serviceProvider.GetService(validatorType) as IValidator;

            if (validator == null) continue;

            var validationContext = new ValidationContext<object>(argument);
            var validationResult = await validator.ValidateAsync(validationContext);

            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );

                context.Result = new BadRequestObjectResult(new
                {
                    Type = "ValidationError",
                    Title = "One or more validation errors occurred",
                    Errors = errors
                });
                return;
            }
        }

        await next();
    }
}
```

Register the filter globally:

```csharp
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();
});
```

## Conditional Validation

Apply rules only when certain conditions are met:

```csharp
public class OrderRequest
{
    public string OrderType { get; set; } = string.Empty;  // "Standard" or "Express"
    public string ShippingAddress { get; set; } = string.Empty;
    public string ExpressDeliveryPhone { get; set; } = string.Empty;
    public DateTime? RequestedDeliveryDate { get; set; }
}

public class OrderRequestValidator : AbstractValidator<OrderRequest>
{
    public OrderRequestValidator()
    {
        RuleFor(x => x.OrderType)
            .NotEmpty()
            .Must(x => x == "Standard" || x == "Express")
            .WithMessage("Order type must be Standard or Express");

        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage("Shipping address is required");

        // Phone is required only for express orders
        RuleFor(x => x.ExpressDeliveryPhone)
            .NotEmpty()
            .When(x => x.OrderType == "Express")
            .WithMessage("Phone number is required for express delivery");

        // Delivery date must be in the future for express orders
        RuleFor(x => x.RequestedDeliveryDate)
            .NotNull()
            .When(x => x.OrderType == "Express")
            .WithMessage("Delivery date is required for express orders");

        RuleFor(x => x.RequestedDeliveryDate)
            .GreaterThan(DateTime.Now)
            .When(x => x.RequestedDeliveryDate.HasValue)
            .WithMessage("Delivery date must be in the future");
    }
}
```

## Async Validation with Database Checks

Validate against data in your database:

```csharp
public class RegisterUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class RegisterUserRequestValidator : AbstractValidator<RegisterUserRequest>
{
    private readonly IUserRepository _userRepository;

    public RegisterUserRequestValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required")
            .MinimumLength(3).WithMessage("Username must be at least 3 characters")
            .MaximumLength(50).WithMessage("Username cannot exceed 50 characters")
            .MustAsync(BeUniqueUsername).WithMessage("Username is already taken");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MustAsync(BeUniqueEmail).WithMessage("Email is already registered");
    }

    private async Task<bool> BeUniqueUsername(string username, CancellationToken cancellationToken)
    {
        // Check if username exists in database
        return !await _userRepository.UsernameExistsAsync(username, cancellationToken);
    }

    private async Task<bool> BeUniqueEmail(string email, CancellationToken cancellationToken)
    {
        // Check if email exists in database
        return !await _userRepository.EmailExistsAsync(email, cancellationToken);
    }
}
```

## Complex Object Validation

Validate nested objects and collections:

```csharp
public class CreateOrderRequest
{
    public CustomerInfo Customer { get; set; } = new();
    public List<OrderItem> Items { get; set; } = new();
    public PaymentInfo Payment { get; set; } = new();
}

public class CustomerInfo
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class OrderItem
{
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class PaymentInfo
{
    public string Method { get; set; } = string.Empty;  // "CreditCard" or "BankTransfer"
    public string CardNumber { get; set; } = string.Empty;
    public string BankAccount { get; set; } = string.Empty;
}

// Nested validators
public class CustomerInfoValidator : AbstractValidator<CustomerInfo>
{
    public CustomerInfoValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Customer name is required");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Customer email is required")
            .EmailAddress().WithMessage("Invalid email format");
    }
}

public class OrderItemValidator : AbstractValidator<OrderItem>
{
    public OrderItemValidator()
    {
        RuleFor(x => x.ProductId)
            .NotEmpty().WithMessage("Product ID is required");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero")
            .LessThanOrEqualTo(100).WithMessage("Cannot order more than 100 items");

        RuleFor(x => x.UnitPrice)
            .GreaterThan(0).WithMessage("Unit price must be greater than zero");
    }
}

public class PaymentInfoValidator : AbstractValidator<PaymentInfo>
{
    public PaymentInfoValidator()
    {
        RuleFor(x => x.Method)
            .NotEmpty()
            .Must(m => m == "CreditCard" || m == "BankTransfer")
            .WithMessage("Payment method must be CreditCard or BankTransfer");

        RuleFor(x => x.CardNumber)
            .NotEmpty()
            .CreditCard()
            .When(x => x.Method == "CreditCard")
            .WithMessage("Valid credit card number is required");

        RuleFor(x => x.BankAccount)
            .NotEmpty()
            .Matches(@"^\d{8,17}$")
            .When(x => x.Method == "BankTransfer")
            .WithMessage("Valid bank account number is required");
    }
}

// Main validator using child validators
public class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        // Validate nested customer object
        RuleFor(x => x.Customer)
            .NotNull().WithMessage("Customer information is required")
            .SetValidator(new CustomerInfoValidator());

        // Validate the items collection
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Order must contain at least one item");

        // Validate each item in the collection
        RuleForEach(x => x.Items)
            .SetValidator(new OrderItemValidator());

        // Custom rule for total order value
        RuleFor(x => x.Items)
            .Must(items => items.Sum(i => i.Quantity * i.UnitPrice) <= 10000)
            .WithMessage("Order total cannot exceed $10,000");

        // Validate payment
        RuleFor(x => x.Payment)
            .NotNull().WithMessage("Payment information is required")
            .SetValidator(new PaymentInfoValidator());
    }
}
```

## Reusable Custom Rules

Create extension methods for rules you use across validators:

```csharp
public static class ValidationExtensions
{
    // Validate phone numbers
    public static IRuleBuilderOptions<T, string> PhoneNumber<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\+?[1-9]\d{1,14}$")
            .WithMessage("Invalid phone number format");
    }

    // Validate URLs
    public static IRuleBuilderOptions<T, string> ValidUrl<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var uri)
                         && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            .WithMessage("Invalid URL format");
    }

    // Validate that a string contains no HTML
    public static IRuleBuilderOptions<T, string> NoHtml<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Must(text => !System.Text.RegularExpressions.Regex.IsMatch(text ?? "", "<[^>]*>"))
            .WithMessage("HTML tags are not allowed");
    }

    // Validate file extensions
    public static IRuleBuilderOptions<T, string> AllowedFileExtension<T>(
        this IRuleBuilder<T, string> ruleBuilder,
        params string[] allowedExtensions)
    {
        return ruleBuilder
            .Must(filename =>
            {
                if (string.IsNullOrEmpty(filename)) return false;
                var extension = Path.GetExtension(filename).ToLowerInvariant();
                return allowedExtensions.Contains(extension);
            })
            .WithMessage($"File extension must be one of: {string.Join(", ", allowedExtensions)}");
    }
}

// Using custom rules
public class ProfileUpdateValidator : AbstractValidator<ProfileUpdateRequest>
{
    public ProfileUpdateValidator()
    {
        RuleFor(x => x.Phone)
            .PhoneNumber()
            .When(x => !string.IsNullOrEmpty(x.Phone));

        RuleFor(x => x.Website)
            .ValidUrl()
            .When(x => !string.IsNullOrEmpty(x.Website));

        RuleFor(x => x.Bio)
            .NoHtml()
            .MaximumLength(500);

        RuleFor(x => x.AvatarFileName)
            .AllowedFileExtension(".jpg", ".jpeg", ".png", ".gif")
            .When(x => !string.IsNullOrEmpty(x.AvatarFileName));
    }
}
```

## Testing Validators

FluentValidation makes testing straightforward:

```csharp
using FluentValidation.TestHelper;
using Xunit;

public class CreateUserRequestValidatorTests
{
    private readonly CreateUserRequestValidator _validator;

    public CreateUserRequestValidatorTests()
    {
        _validator = new CreateUserRequestValidator();
    }

    [Fact]
    public void Should_Have_Error_When_Email_Is_Empty()
    {
        var request = new CreateUserRequest { Email = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Email)
              .WithErrorMessage("Email is required");
    }

    [Fact]
    public void Should_Have_Error_When_Email_Is_Invalid()
    {
        var request = new CreateUserRequest { Email = "not-an-email" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Email)
              .WithErrorMessage("Invalid email format");
    }

    [Fact]
    public void Should_Not_Have_Error_When_Email_Is_Valid()
    {
        var request = new CreateUserRequest { Email = "user@example.com" };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("short")]           // Too short
    [InlineData("nouppercase1!")]   // No uppercase
    [InlineData("NOLOWERCASE1!")]   // No lowercase
    [InlineData("NoDigits!")]       // No digits
    [InlineData("NoSpecial1")]      // No special chars
    public void Should_Have_Error_For_Weak_Password(string password)
    {
        var request = new CreateUserRequest { Password = password };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Should_Not_Have_Error_For_Strong_Password()
    {
        var request = new CreateUserRequest { Password = "StrongP@ss1" };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Password);
    }
}
```

## Summary

| Feature | Example |
|---------|---------|
| **Basic Rules** | `NotEmpty()`, `EmailAddress()`, `MaximumLength()` |
| **Conditional** | `.When(x => x.Type == "Express")` |
| **Async** | `.MustAsync(BeUnique)` |
| **Collections** | `RuleForEach(x => x.Items)` |
| **Nested Objects** | `.SetValidator(new ChildValidator())` |
| **Custom Rules** | Extension methods |

FluentValidation brings order to request validation. By separating validation logic into dedicated classes, your code becomes easier to read, test, and maintain. The fluent API handles everything from simple required fields to complex async database lookups, keeping your controllers focused on their actual job.
