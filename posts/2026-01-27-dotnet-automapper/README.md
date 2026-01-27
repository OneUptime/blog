# How to Use AutoMapper in .NET Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, AutoMapper, Object Mapping, DTOs, Clean Architecture

Description: Learn how to use AutoMapper in .NET applications for object-to-object mapping, including profiles, custom mappings, and best practices for clean, maintainable code.

---

> AutoMapper eliminates the tedious code of copying properties between objects. Configure it once, trust it everywhere, and keep your codebase focused on business logic instead of boilerplate.

Mapping data between objects is one of the most repetitive tasks in application development. Whether you're converting database entities to DTOs, transforming API responses, or moving data between layers, manual mapping code quickly becomes verbose and error-prone. AutoMapper solves this by automating property-to-property mapping based on conventions and explicit configuration.

## What is AutoMapper and Why Use It

AutoMapper is a convention-based object-to-object mapper for .NET. It works by matching property names between source and destination types automatically, while allowing custom mappings when conventions don't apply.

Benefits of using AutoMapper:

- **Reduces boilerplate code** - No more writing dozens of property assignments
- **Centralizes mapping logic** - All mappings are defined in profiles, not scattered across services
- **Type-safe configuration** - Compile-time checking catches misconfigurations early
- **Testable** - Mapping configurations can be validated in unit tests
- **Flexible** - Supports complex scenarios like nested objects, collections, and conditional mapping

## Installing and Configuring AutoMapper

Install the NuGet packages:

```bash
# Core AutoMapper package
dotnet add package AutoMapper

# Dependency injection extensions for ASP.NET Core
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection
```

Register AutoMapper in your `Program.cs`:

```csharp
using AutoMapper;

var builder = WebApplication.CreateBuilder(args);

// Register AutoMapper and scan the assembly for profiles
builder.Services.AddAutoMapper(typeof(Program).Assembly);

// For multiple assemblies, pass them all
// builder.Services.AddAutoMapper(typeof(Program).Assembly, typeof(SomeProfile).Assembly);

var app = builder.Build();
```

## Creating Mapping Profiles

Profiles are the recommended way to organize your mappings. Each profile groups related mappings together.

```csharp
using AutoMapper;

// Define your domain entity
public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

// Define your DTO
public class UserDto
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
}

// Create a profile to define the mapping
public class UserProfile : Profile
{
    public UserProfile()
    {
        // Basic mapping - properties with matching names are mapped automatically
        CreateMap<User, UserDto>();

        // Reverse mapping if you need to go both directions
        CreateMap<UserDto, User>();

        // Or use ReverseMap() for bidirectional mapping
        // CreateMap<User, UserDto>().ReverseMap();
    }
}
```

## Basic Mapping Conventions

AutoMapper automatically maps properties when:

- Property names match exactly (case-insensitive)
- Property names follow flattening conventions (e.g., `Order.Customer.Name` maps to `CustomerName`)
- Types are compatible or have a configured conversion

```csharp
public class Order
{
    public int Id { get; set; }
    public Customer Customer { get; set; }
    public decimal TotalAmount { get; set; }
}

public class Customer
{
    public string Name { get; set; }
    public string Email { get; set; }
}

// AutoMapper flattens nested properties automatically
public class OrderDto
{
    public int Id { get; set; }
    public string CustomerName { get; set; }   // Maps from Order.Customer.Name
    public string CustomerEmail { get; set; }  // Maps from Order.Customer.Email
    public decimal TotalAmount { get; set; }
}

public class OrderProfile : Profile
{
    public OrderProfile()
    {
        // Flattening happens automatically - no configuration needed
        CreateMap<Order, OrderDto>();
    }
}
```

## Custom Member Mappings with ForMember

When conventions don't match your needs, use `ForMember` to define custom mappings.

```csharp
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class ProductDto
{
    public int ProductId { get; set; }
    public string DisplayName { get; set; }
    public string FormattedPrice { get; set; }
    public bool InStock { get; set; }
    public string UpdatedDate { get; set; }
}

public class ProductProfile : Profile
{
    public ProductProfile()
    {
        CreateMap<Product, ProductDto>()
            // Map to a differently named property
            .ForMember(dest => dest.ProductId, opt => opt.MapFrom(src => src.Id))

            // Transform the value during mapping
            .ForMember(dest => dest.DisplayName, opt => opt.MapFrom(src => src.Name.ToUpper()))

            // Format a value
            .ForMember(dest => dest.FormattedPrice, opt => opt.MapFrom(src => $"${src.Price:N2}"))

            // Compute a boolean from another property
            .ForMember(dest => dest.InStock, opt => opt.MapFrom(src => src.StockQuantity > 0))

            // Format dates as strings
            .ForMember(dest => dest.UpdatedDate, opt => opt.MapFrom(src => src.LastUpdated.ToString("yyyy-MM-dd")));
    }
}
```

### Ignoring Properties

Sometimes you want to skip certain properties:

```csharp
CreateMap<User, UserDto>()
    // Ignore a property entirely
    .ForMember(dest => dest.SensitiveField, opt => opt.Ignore())

    // Ignore all unmapped properties (use with caution)
    .ForAllMembers(opt => opt.Condition((src, dest, srcMember) => srcMember != null));
```

## Nested Object Mapping

AutoMapper handles nested objects when you define mappings for all involved types.

```csharp
public class Author
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Bio { get; set; }
}

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; }
    public Author Author { get; set; }
    public List<Chapter> Chapters { get; set; }
}

public class Chapter
{
    public int Number { get; set; }
    public string Title { get; set; }
    public int PageCount { get; set; }
}

// DTOs
public class AuthorDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}

public class ChapterDto
{
    public int Number { get; set; }
    public string Title { get; set; }
}

public class BookDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public AuthorDto Author { get; set; }       // Nested object
    public List<ChapterDto> Chapters { get; set; }  // Nested collection
}

public class BookProfile : Profile
{
    public BookProfile()
    {
        // Define mappings for all types involved
        CreateMap<Author, AuthorDto>();
        CreateMap<Chapter, ChapterDto>();
        CreateMap<Book, BookDto>();  // AutoMapper uses the above mappings for nested types
    }
}
```

## Collection Mapping

Collections are mapped automatically when the element types have mappings defined.

```csharp
public class OrderService
{
    private readonly IMapper _mapper;

    public OrderService(IMapper mapper)
    {
        _mapper = mapper;
    }

    public List<OrderDto> GetOrders(List<Order> orders)
    {
        // Map a list - AutoMapper handles the iteration
        return _mapper.Map<List<OrderDto>>(orders);
    }

    public IEnumerable<OrderDto> GetOrdersEnumerable(IEnumerable<Order> orders)
    {
        // Works with any enumerable type
        return _mapper.Map<IEnumerable<OrderDto>>(orders);
    }

    public OrderDto[] GetOrdersArray(Order[] orders)
    {
        // Also works with arrays
        return _mapper.Map<OrderDto[]>(orders);
    }
}
```

## Conditional Mapping

Map properties only when certain conditions are met.

```csharp
public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Salary { get; set; }
    public string Department { get; set; }
    public bool IsManager { get; set; }
}

public class EmployeeDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal? Salary { get; set; }
    public string Department { get; set; }
}

public class EmployeeProfile : Profile
{
    public EmployeeProfile()
    {
        CreateMap<Employee, EmployeeDto>()
            // Only map salary if the employee is a manager
            .ForMember(dest => dest.Salary, opt => opt.Condition(src => src.IsManager))

            // Only map if the source value is not null or empty
            .ForMember(dest => dest.Department, opt => opt.Condition(src => !string.IsNullOrEmpty(src.Department)));
    }
}
```

### Pre-conditions vs Conditions

```csharp
CreateMap<Source, Destination>()
    // PreCondition: checked before resolving the source value
    .ForMember(dest => dest.Value, opt => opt.PreCondition(src => src.ShouldMap))

    // Condition: checked after resolving the source value
    .ForMember(dest => dest.Value, opt => opt.Condition((src, dest, srcValue) => srcValue != null));
```

## Dependency Injection Setup

For ASP.NET Core applications, inject `IMapper` wherever you need it.

```csharp
// In a controller
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMapper _mapper;
    private readonly IUserRepository _repository;

    public UsersController(IMapper mapper, IUserRepository repository)
    {
        _mapper = mapper;
        _repository = repository;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        var user = await _repository.GetByIdAsync(id);
        if (user == null)
            return NotFound();

        return _mapper.Map<UserDto>(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto createDto)
    {
        // Map from DTO to entity
        var user = _mapper.Map<User>(createDto);

        await _repository.AddAsync(user);

        // Map back to response DTO
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, _mapper.Map<UserDto>(user));
    }
}

// In a service
public class UserService : IUserService
{
    private readonly IMapper _mapper;
    private readonly IUserRepository _repository;

    public UserService(IMapper mapper, IUserRepository repository)
    {
        _mapper = mapper;
        _repository = repository;
    }

    public async Task<UserDto> GetUserAsync(int id)
    {
        var user = await _repository.GetByIdAsync(id);
        return _mapper.Map<UserDto>(user);
    }
}
```

## Testing Mappings

Always validate your AutoMapper configuration in tests.

```csharp
using AutoMapper;
using Xunit;

public class MappingTests
{
    private readonly IMapper _mapper;

    public MappingTests()
    {
        // Create a mapper configuration with all profiles
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<UserProfile>();
            cfg.AddProfile<OrderProfile>();
            cfg.AddProfile<ProductProfile>();
        });

        _mapper = config.CreateMapper();
    }

    [Fact]
    public void Configuration_IsValid()
    {
        // This validates that all mappings are correctly configured
        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<UserProfile>();
            cfg.AddProfile<OrderProfile>();
            cfg.AddProfile<ProductProfile>();
        });

        // Throws if any mappings are invalid
        config.AssertConfigurationIsValid();
    }

    [Fact]
    public void User_Maps_To_UserDto()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            FirstName = "John",
            LastName = "Doe",
            Email = "john@example.com",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        // Act
        var dto = _mapper.Map<UserDto>(user);

        // Assert
        Assert.Equal(user.Id, dto.Id);
        Assert.Equal(user.FirstName, dto.FirstName);
        Assert.Equal(user.LastName, dto.LastName);
        Assert.Equal(user.Email, dto.Email);
    }

    [Fact]
    public void Product_Maps_With_Custom_Formatting()
    {
        // Arrange
        var product = new Product
        {
            Id = 1,
            Name = "Widget",
            Price = 29.99m,
            StockQuantity = 10,
            LastUpdated = new DateTime(2024, 1, 15)
        };

        // Act
        var dto = _mapper.Map<ProductDto>(product);

        // Assert
        Assert.Equal(1, dto.ProductId);
        Assert.Equal("WIDGET", dto.DisplayName);
        Assert.Equal("$29.99", dto.FormattedPrice);
        Assert.True(dto.InStock);
        Assert.Equal("2024-01-15", dto.UpdatedDate);
    }
}
```

## Performance Considerations

AutoMapper is fast for most use cases, but here are tips for optimal performance:

### 1. Avoid Mapping in Tight Loops

```csharp
// Less efficient - creates overhead per iteration
foreach (var user in users)
{
    var dto = _mapper.Map<UserDto>(user);
    results.Add(dto);
}

// More efficient - map the entire collection at once
var dtos = _mapper.Map<List<UserDto>>(users);
```

### 2. Use ProjectTo for Database Queries

When using Entity Framework, `ProjectTo` translates mappings into SQL projections:

```csharp
public class UserRepository
{
    private readonly DbContext _context;
    private readonly IMapper _mapper;

    public UserRepository(DbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<UserDto>> GetActiveUsersAsync()
    {
        // ProjectTo creates a SELECT with only the needed columns
        // No need to load full entities into memory
        return await _context.Users
            .Where(u => u.IsActive)
            .ProjectTo<UserDto>(_mapper.ConfigurationProvider)
            .ToListAsync();
    }
}
```

### 3. Compile Mappings at Startup

```csharp
var config = new MapperConfiguration(cfg =>
{
    cfg.AddProfile<UserProfile>();
});

// Compile all mappings upfront to avoid runtime compilation
config.CompileMappings();

var mapper = config.CreateMapper();
```

### 4. Avoid Over-Mapping

Don't create DTOs with dozens of properties if you only need a few. Create specific DTOs for specific use cases:

```csharp
// For list views - minimal data
public class UserListItemDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}

// For detail views - full data
public class UserDetailDto
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Email { get; set; }
    public AddressDto Address { get; set; }
    public List<OrderDto> RecentOrders { get; set; }
}
```

## Best Practices Summary

1. **Organize mappings in profiles** - Group related mappings together for maintainability
2. **Validate configuration in tests** - Call `AssertConfigurationIsValid()` to catch misconfigurations early
3. **Use ProjectTo with EF Core** - Let the database do the projection instead of loading full entities
4. **Create purpose-specific DTOs** - Don't create one massive DTO; create focused ones for each use case
5. **Avoid complex logic in mappings** - Keep mappings simple; complex transformations belong in services
6. **Document non-obvious mappings** - Add comments for custom `ForMember` configurations
7. **Test critical mappings explicitly** - Beyond configuration validation, test important mappings individually
8. **Register profiles in one place** - Use assembly scanning to avoid missing registrations

---

AutoMapper simplifies one of the most tedious parts of .NET development. By embracing conventions and keeping configurations organized, you can eliminate thousands of lines of manual mapping code while maintaining type safety and testability.

For monitoring your .NET applications in production, including tracking performance of services that use AutoMapper, check out [OneUptime](https://oneuptime.com) - a complete observability platform with metrics, traces, and logs.
