# How to Create Validation Attributes with FluentValidation in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, FluentValidation, Validation, ASP.NET Core

Description: Learn how to build custom validation rules with FluentValidation in .NET applications. This guide covers basic validators, custom rules, conditional validation, and integration with ASP.NET Core.

---

Input validation is one of those things that seems simple until you need to handle complex business rules. While Data Annotations work for basic scenarios, they quickly become unwieldy when you need conditional validation, cross-property rules, or reusable validation logic. FluentValidation provides a clean, fluent API that keeps your validation logic separate from your models.

## Why FluentValidation?

FluentValidation offers several advantages over the built-in Data Annotations:

- **Separation of concerns**: Validation logic lives in dedicated classes, not scattered across model properties
- **Testability**: Validators are plain classes that you can unit test easily
- **Conditional validation**: Apply rules only when certain conditions are met
- **Cross-property validation**: Validate one property based on another
- **Reusable validators**: Create custom validators and reuse them across your application

## Getting Started

First, install the NuGet packages:

```bash
dotnet add package FluentValidation
dotnet add package FluentValidation.AspNetCore
```

## Basic Validator Setup

Let's start with a simple model and its validator:

```csharp
// Models/CreateUserRequest.cs
public class CreateUserRequest
{
    public string Email { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public string ConfirmPassword { get; set; }
    public int Age { get; set; }
    public string PhoneNumber { get; set; }
}

// Validators/CreateUserRequestValidator.cs
using FluentValidation;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        // Email must be present and valid format
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255).WithMessage("Email cannot exceed 255 characters");

        // Username rules with custom message
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required")
            .MinimumLength(3).WithMessage("Username must be at least 3 characters")
            .MaximumLength(50).WithMessage("Username cannot exceed 50 characters")
            .Matches("^[a-zA-Z0-9_]+$").WithMessage("Username can only contain letters, numbers, and underscores");

        // Password with multiple requirements
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit");

        // Confirm password must match
        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("Passwords do not match");

        // Age validation with range
        RuleFor(x => x.Age)
            .InclusiveBetween(18, 120).WithMessage("Age must be between 18 and 120");
    }
}
```

## Registering Validators with Dependency Injection

In your `Program.cs`, register the validators:

```csharp
using FluentValidation;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Register all validators from the assembly
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserRequestValidator>();

// Enable automatic validation in the MVC pipeline
builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();
app.Run();
```

## Creating Custom Validators

For reusable validation logic, create custom validators:

```csharp
// Validators/CustomValidators.cs
using FluentValidation;

public static class CustomValidators
{
    // Phone number validator that works for US format
    public static IRuleBuilderOptions<T, string> ValidPhoneNumber<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .Matches(@"^\+?1?\d{10,14}$")
            .WithMessage("Invalid phone number format");
    }

    // Strong password validator with configurable requirements
    public static IRuleBuilderOptions<T, string> StrongPassword<T>(
        this IRuleBuilder<T, string> ruleBuilder,
        int minLength = 8,
        bool requireUppercase = true,
        bool requireLowercase = true,
        bool requireDigit = true,
        bool requireSpecialChar = false)
    {
        var builder = ruleBuilder
            .MinimumLength(minLength)
            .WithMessage($"Password must be at least {minLength} characters");

        if (requireUppercase)
        {
            builder = builder.Matches("[A-Z]")
                .WithMessage("Password must contain at least one uppercase letter");
        }

        if (requireLowercase)
        {
            builder = builder.Matches("[a-z]")
                .WithMessage("Password must contain at least one lowercase letter");
        }

        if (requireDigit)
        {
            builder = builder.Matches("[0-9]")
                .WithMessage("Password must contain at least one digit");
        }

        if (requireSpecialChar)
        {
            builder = builder.Matches("[!@#$%^&*(),.?\":{}|<>]")
                .WithMessage("Password must contain at least one special character");
        }

        return builder;
    }
}

// Usage in a validator
public class RegistrationValidator : AbstractValidator<RegistrationRequest>
{
    public RegistrationValidator()
    {
        RuleFor(x => x.Password).StrongPassword(minLength: 10, requireSpecialChar: true);
        RuleFor(x => x.PhoneNumber).ValidPhoneNumber();
    }
}
```

## Conditional Validation

Apply rules based on other property values:

```csharp
public class OrderValidator : AbstractValidator<OrderRequest>
{
    public OrderValidator()
    {
        RuleFor(x => x.OrderType)
            .NotEmpty().WithMessage("Order type is required");

        // Only validate shipping address for physical products
        RuleFor(x => x.ShippingAddress)
            .NotEmpty().WithMessage("Shipping address is required for physical orders")
            .When(x => x.OrderType == "Physical");

        // Only validate email for digital products
        RuleFor(x => x.DeliveryEmail)
            .NotEmpty().WithMessage("Email is required for digital orders")
            .EmailAddress().WithMessage("Invalid email format")
            .When(x => x.OrderType == "Digital");

        // Credit card required unless using PayPal
        RuleFor(x => x.CreditCardNumber)
            .NotEmpty().WithMessage("Credit card number is required")
            .CreditCard().WithMessage("Invalid credit card number")
            .Unless(x => x.PaymentMethod == "PayPal");

        // Quantity must be positive, and if bulk order, minimum 10
        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero")
            .GreaterThanOrEqualTo(10).WithMessage("Bulk orders require minimum 10 items")
            .When(x => x.IsBulkOrder);
    }
}
```

## Async Validation with Database Checks

Sometimes validation requires checking against external sources:

```csharp
public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    private readonly IUserRepository _userRepository;

    public CreateUserValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MustAsync(BeUniqueEmail).WithMessage("Email is already registered");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required")
            .MustAsync(BeUniqueUsername).WithMessage("Username is already taken");
    }

    // Async check against database
    private async Task<bool> BeUniqueEmail(string email, CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetByEmailAsync(email, cancellationToken);
        return existingUser == null;
    }

    private async Task<bool> BeUniqueUsername(string username, CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetByUsernameAsync(username, cancellationToken);
        return existingUser == null;
    }
}
```

## Collection Validation

Validate items within collections:

```csharp
public class ShoppingCartValidator : AbstractValidator<ShoppingCart>
{
    public ShoppingCartValidator()
    {
        // Cart must have at least one item
        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Cart cannot be empty");

        // Validate each item in the cart
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId)
                .NotEmpty().WithMessage("Product ID is required");

            item.RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be positive")
                .LessThanOrEqualTo(100).WithMessage("Maximum 100 items per product");

            item.RuleFor(x => x.Price)
                .GreaterThan(0).WithMessage("Price must be positive");
        });

        // Custom validation across all items
        RuleFor(x => x.Items)
            .Must(items => items.Sum(i => i.Quantity) <= 500)
            .WithMessage("Total items cannot exceed 500");
    }
}
```

## Nested Object Validation

Validate complex nested objects:

```csharp
// Models
public class Company
{
    public string Name { get; set; }
    public Address HeadquartersAddress { get; set; }
    public ContactPerson PrimaryContact { get; set; }
}

public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string PostalCode { get; set; }
    public string Country { get; set; }
}

public class ContactPerson
{
    public string Name { get; set; }
    public string Email { get; set; }
    public string Phone { get; set; }
}

// Validators
public class AddressValidator : AbstractValidator<Address>
{
    public AddressValidator()
    {
        RuleFor(x => x.Street).NotEmpty().WithMessage("Street is required");
        RuleFor(x => x.City).NotEmpty().WithMessage("City is required");
        RuleFor(x => x.PostalCode).NotEmpty().WithMessage("Postal code is required");
        RuleFor(x => x.Country).NotEmpty().WithMessage("Country is required");
    }
}

public class ContactPersonValidator : AbstractValidator<ContactPerson>
{
    public ContactPersonValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Contact name is required");
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone).NotEmpty();
    }
}

public class CompanyValidator : AbstractValidator<Company>
{
    public CompanyValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Company name is required")
            .MaximumLength(200);

        // Use nested validators
        RuleFor(x => x.HeadquartersAddress)
            .NotNull().WithMessage("Headquarters address is required")
            .SetValidator(new AddressValidator());

        RuleFor(x => x.PrimaryContact)
            .NotNull().WithMessage("Primary contact is required")
            .SetValidator(new ContactPersonValidator());
    }
}
```

## Manual Validation in Services

Sometimes you need to validate manually in service layers:

```csharp
public class UserService
{
    private readonly IValidator<CreateUserRequest> _validator;
    private readonly IUserRepository _repository;

    public UserService(
        IValidator<CreateUserRequest> validator,
        IUserRepository repository)
    {
        _validator = validator;
        _repository = repository;
    }

    public async Task<Result<User>> CreateUserAsync(CreateUserRequest request)
    {
        // Validate manually
        var validationResult = await _validator.ValidateAsync(request);

        if (!validationResult.IsValid)
        {
            // Return validation errors
            var errors = validationResult.Errors
                .Select(e => new ValidationError(e.PropertyName, e.ErrorMessage))
                .ToList();

            return Result<User>.Failure(errors);
        }

        // Proceed with user creation
        var user = new User
        {
            Email = request.Email,
            Username = request.Username
        };

        await _repository.AddAsync(user);
        return Result<User>.Success(user);
    }
}
```

## Custom Error Response Format

Customize how validation errors are returned from your API:

```csharp
// Program.cs
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value.Errors.Count > 0)
                .SelectMany(e => e.Value.Errors.Select(error => new
                {
                    Field = e.Key,
                    Message = error.ErrorMessage
                }))
                .ToList();

            var response = new
            {
                Success = false,
                Errors = errors
            };

            return new BadRequestObjectResult(response);
        };
    });
```

## Unit Testing Validators

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
        var model = new CreateUserRequest { Email = "" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Should_Have_Error_When_Email_Is_Invalid()
    {
        var model = new CreateUserRequest { Email = "not-an-email" };
        var result = _validator.TestValidate(model);
        result.ShouldHaveValidationErrorFor(x => x.Email)
            .WithErrorMessage("Invalid email format");
    }

    [Fact]
    public void Should_Not_Have_Error_When_Email_Is_Valid()
    {
        var model = new CreateUserRequest { Email = "test@example.com" };
        var result = _validator.TestValidate(model);
        result.ShouldNotHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("ab", false)]      // Too short
    [InlineData("abc", true)]       // Minimum length
    [InlineData("valid_user123", true)]
    [InlineData("invalid user", false)]  // Contains space
    public void Should_Validate_Username_Correctly(string username, bool shouldBeValid)
    {
        var model = new CreateUserRequest { Username = username };
        var result = _validator.TestValidate(model);

        if (shouldBeValid)
            result.ShouldNotHaveValidationErrorFor(x => x.Username);
        else
            result.ShouldHaveValidationErrorFor(x => x.Username);
    }
}
```

## Summary

FluentValidation provides a powerful and flexible way to handle input validation in .NET applications. Key takeaways:

| Feature | Use Case |
|---------|----------|
| **Basic rules** | Email, length, range validation |
| **Custom validators** | Reusable validation logic |
| **Conditional rules** | When/Unless for context-aware validation |
| **Async validation** | Database uniqueness checks |
| **Collection rules** | Validating arrays and lists |
| **Nested validators** | Complex object graphs |

By keeping validation logic in dedicated validator classes, your code stays clean, testable, and maintainable. The fluent API makes it easy to read and understand what rules apply to each property, even for complex validation scenarios.
