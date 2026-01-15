# How to Create Type-Safe Forms in React with React Hook Form and Zod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, React Hook Form, Zod, TypeScript, Forms, Validation

Description: Learn how to build type-safe, performant forms in React using React Hook Form for state management and Zod for schema-based validation with automatic TypeScript inference.

---

Forms are the backbone of web applications, handling everything from user authentication to complex data entry. However, managing form state, validation, and type safety in React can quickly become complex. React Hook Form combined with Zod provides a powerful solution that delivers excellent developer experience, runtime validation, and compile-time type safety.

## Why React Hook Form and Zod?

React Hook Form is a performant form library that minimizes re-renders by using uncontrolled components and refs. Zod is a TypeScript-first schema declaration and validation library that lets you define schemas once and infer TypeScript types automatically.

Together, they solve several common problems:

- **Type safety**: Schema definitions automatically generate TypeScript types
- **Performance**: Minimal re-renders compared to controlled form approaches
- **Validation**: Declarative schema-based validation with detailed error messages
- **Developer experience**: Less boilerplate, better autocomplete, compile-time error detection

## Installation

```bash
npm install react-hook-form zod @hookform/resolvers
```

Or with yarn:

```bash
yarn add react-hook-form zod @hookform/resolvers
```

The `@hookform/resolvers` package provides the bridge between React Hook Form and Zod (and other validation libraries).

## Basic Form Setup

Let's start with a simple login form to understand the fundamentals.

### Defining the Schema

```typescript
import { z } from 'zod';

// Define the validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

// Infer the TypeScript type from the schema
type LoginFormData = z.infer<typeof loginSchema>;
// Results in: { email: string; password: string; rememberMe?: boolean }
```

### Creating the Form Component

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // data is fully typed here
    console.log('Form data:', data);
    await authenticateUser(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <span role="alert">{errors.email.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && (
          <span role="alert">{errors.password.message}</span>
        )}
      </div>

      <div>
        <label>
          <input type="checkbox" {...register('rememberMe')} />
          Remember me
        </label>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

## Advanced Validation Schemas

Zod provides powerful validation primitives for complex scenarios.

### String Validations

```typescript
const userSchema = z.object({
  // Basic string validations
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

  // Email validation
  email: z.string().email('Invalid email format'),

  // URL validation
  website: z.string().url('Invalid URL').optional(),

  // UUID validation
  userId: z.string().uuid('Invalid user ID'),

  // Custom transformations
  slug: z
    .string()
    .transform((val) => val.toLowerCase().replace(/\s+/g, '-')),
});
```

### Number Validations

```typescript
const productSchema = z.object({
  // Integer validation
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be positive')
    .max(100, 'Maximum quantity is 100'),

  // Price with precision
  price: z
    .number()
    .positive('Price must be positive')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),

  // Coercion from string input
  stock: z.coerce.number().int().nonnegative(),
});
```

### Date Validations

```typescript
const eventSchema = z.object({
  // Basic date
  createdAt: z.date(),

  // Date from string input
  startDate: z.coerce.date(),

  // Date range validation
  endDate: z.coerce.date(),

  // Age validation
  birthDate: z
    .coerce
    .date()
    .refine(
      (date) => {
        const age = Math.floor(
          (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        return age >= 18;
      },
      { message: 'Must be at least 18 years old' }
    ),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);
```

### Enum and Union Types

```typescript
// Enum validation
const roleSchema = z.enum(['admin', 'user', 'moderator']);

// Native enum
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}
const statusSchema = z.nativeEnum(Status);

// Discriminated unions
const notificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    emailAddress: z.string().email(),
    subject: z.string(),
  }),
  z.object({
    type: z.literal('sms'),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  }),
  z.object({
    type: z.literal('push'),
    deviceToken: z.string(),
  }),
]);

type Notification = z.infer<typeof notificationSchema>;
```

### Array Validations

```typescript
const orderSchema = z.object({
  // Array with item validation
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1, 'Order must have at least one item')
    .max(50, 'Order cannot exceed 50 items'),

  // Unique values
  tags: z
    .array(z.string())
    .refine(
      (tags) => new Set(tags).size === tags.length,
      { message: 'Tags must be unique' }
    ),
});
```

## Complex Form Patterns

### Conditional Fields

Forms often need fields that appear or validate based on other field values.

```typescript
const shippingSchema = z.discriminatedUnion('shippingMethod', [
  z.object({
    shippingMethod: z.literal('pickup'),
    pickupLocation: z.string().min(1, 'Select a pickup location'),
  }),
  z.object({
    shippingMethod: z.literal('delivery'),
    address: z.object({
      street: z.string().min(1, 'Street is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    }),
  }),
  z.object({
    shippingMethod: z.literal('international'),
    address: z.object({
      street: z.string().min(1, 'Street is required'),
      city: z.string().min(1, 'City is required'),
      country: z.string().min(1, 'Country is required'),
      postalCode: z.string().min(1, 'Postal code is required'),
    }),
    customsInfo: z.object({
      declaredValue: z.number().positive(),
      description: z.string().min(1, 'Description required for customs'),
    }),
  }),
]);

type ShippingFormData = z.infer<typeof shippingSchema>;
```

```tsx
function ShippingForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingMethod: 'delivery',
    },
  });

  const shippingMethod = watch('shippingMethod');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register('shippingMethod')}>
        <option value="pickup">Store Pickup</option>
        <option value="delivery">Delivery</option>
        <option value="international">International</option>
      </select>

      {shippingMethod === 'pickup' && (
        <select {...register('pickupLocation')}>
          <option value="">Select location</option>
          <option value="store-1">Downtown Store</option>
          <option value="store-2">Mall Location</option>
        </select>
      )}

      {(shippingMethod === 'delivery' || shippingMethod === 'international') && (
        <>
          <input {...register('address.street')} placeholder="Street" />
          <input {...register('address.city')} placeholder="City" />
          {shippingMethod === 'delivery' && (
            <>
              <input {...register('address.state')} placeholder="State" />
              <input {...register('address.zipCode')} placeholder="ZIP Code" />
            </>
          )}
          {shippingMethod === 'international' && (
            <>
              <input {...register('address.country')} placeholder="Country" />
              <input {...register('address.postalCode')} placeholder="Postal Code" />
              <input
                type="number"
                {...register('customsInfo.declaredValue', { valueAsNumber: true })}
                placeholder="Declared Value"
              />
              <textarea
                {...register('customsInfo.description')}
                placeholder="Contents description"
              />
            </>
          )}
        </>
      )}

      <button type="submit">Continue</button>
    </form>
  );
}
```

### Password Confirmation

```typescript
const registrationSchema = z
  .object({
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegistrationFormData = z.infer<typeof registrationSchema>;
```

### Dynamic Form Arrays

```tsx
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const teamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  members: z
    .array(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
        role: z.enum(['leader', 'member', 'observer']),
      })
    )
    .min(1, 'At least one member is required')
    .max(10, 'Maximum 10 members allowed'),
});

type TeamFormData = z.infer<typeof teamSchema>;

function TeamForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      teamName: '',
      members: [{ name: '', email: '', role: 'member' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  });

  const onSubmit = (data: TeamFormData) => {
    console.log('Team data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Team Name</label>
        <input {...register('teamName')} />
        {errors.teamName && <span>{errors.teamName.message}</span>}
      </div>

      <h3>Team Members</h3>
      {errors.members?.root && (
        <span>{errors.members.root.message}</span>
      )}

      {fields.map((field, index) => (
        <div key={field.id}>
          <input
            {...register(`members.${index}.name`)}
            placeholder="Name"
          />
          {errors.members?.[index]?.name && (
            <span>{errors.members[index].name.message}</span>
          )}

          <input
            {...register(`members.${index}.email`)}
            placeholder="Email"
          />
          {errors.members?.[index]?.email && (
            <span>{errors.members[index].email.message}</span>
          )}

          <select {...register(`members.${index}.role`)}>
            <option value="leader">Leader</option>
            <option value="member">Member</option>
            <option value="observer">Observer</option>
          </select>

          {fields.length > 1 && (
            <button type="button" onClick={() => remove(index)}>
              Remove
            </button>
          )}
        </div>
      ))}

      {fields.length < 10 && (
        <button
          type="button"
          onClick={() => append({ name: '', email: '', role: 'member' })}
        >
          Add Member
        </button>
      )}

      <button type="submit">Create Team</button>
    </form>
  );
}
```

## Async Validation

Some validations require server-side checks, like verifying username availability.

```typescript
const asyncUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid characters')
    .refine(
      async (username) => {
        const response = await fetch(`/api/check-username?username=${username}`);
        const { available } = await response.json();
        return available;
      },
      { message: 'Username is already taken' }
    ),
  email: z.string().email(),
});
```

For better UX, you might want to debounce the async validation:

```tsx
import { useForm } from 'react-hook-form';
import { useState, useCallback } from 'react';
import debounce from 'lodash/debounce';

function RegistrationForm() {
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const checkUsername = useCallback(
    debounce(async (username: string) => {
      if (username.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');
      try {
        const response = await fetch(`/api/check-username?username=${username}`);
        const { available } = await response.json();
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500),
    []
  );

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('username', {
          onChange: (e) => checkUsername(e.target.value),
        })}
      />
      {usernameStatus === 'checking' && <span>Checking availability...</span>}
      {usernameStatus === 'available' && <span>Username is available</span>}
      {usernameStatus === 'taken' && <span>Username is taken</span>}
      {errors.username && <span>{errors.username.message}</span>}
    </form>
  );
}
```

## Custom Validation Messages with i18n

```typescript
import { z } from 'zod';

// Custom error map for internationalization
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const t = getTranslation(); // Your i18n function

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return { message: t('validation.string_required') };
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: t('validation.min_length', { min: issue.minimum }) };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: t('validation.max_length', { max: issue.maximum }) };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: t('validation.invalid_email') };
      }
      break;
  }

  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
```

## Reusable Form Components

Create a library of type-safe form components.

### Generic Input Component

```tsx
import { UseFormRegister, FieldErrors, Path, FieldValues } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
}

function FormInput<T extends FieldValues>({
  label,
  name,
  register,
  errors,
  type = 'text',
  placeholder,
  required,
}: FormInputProps<T>) {
  const error = errors[name];

  return (
    <div className="form-field">
      <label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <span id={`${name}-error`} role="alert" className="error">
          {error.message as string}
        </span>
      )}
    </div>
  );
}
```

### Generic Select Component

```tsx
import { UseFormRegister, FieldErrors, Path, FieldValues } from 'react-hook-form';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  options: Option[];
  placeholder?: string;
  required?: boolean;
}

function FormSelect<T extends FieldValues>({
  label,
  name,
  register,
  errors,
  options,
  placeholder,
  required,
}: FormSelectProps<T>) {
  const error = errors[name];

  return (
    <div className="form-field">
      <label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      <select
        id={name}
        {...register(name)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${name}-error`} role="alert" className="error">
          {error.message as string}
        </span>
      )}
    </div>
  );
}
```

### Usage with Type Safety

```tsx
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  country: z.string().min(1, 'Country is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const countries: Option[] = [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput<ProfileFormData>
        label="First Name"
        name="firstName"
        register={register}
        errors={errors}
        required
      />
      <FormInput<ProfileFormData>
        label="Last Name"
        name="lastName"
        register={register}
        errors={errors}
        required
      />
      <FormInput<ProfileFormData>
        label="Email"
        name="email"
        type="email"
        register={register}
        errors={errors}
        required
      />
      <FormSelect<ProfileFormData>
        label="Country"
        name="country"
        register={register}
        errors={errors}
        options={countries}
        placeholder="Select a country"
        required
      />
      <button type="submit">Save Profile</button>
    </form>
  );
}
```

## Form Submission and Error Handling

### Handling Server Errors

```tsx
import { useForm } from 'react-hook-form';
import { useState } from 'react';

interface ServerError {
  field?: string;
  message: string;
}

function SubmissionForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle field-specific errors
        if (errorData.errors) {
          errorData.errors.forEach((error: ServerError) => {
            if (error.field) {
              setError(error.field as keyof FormData, {
                type: 'server',
                message: error.message,
              });
            }
          });
        }

        // Handle general errors
        if (errorData.message) {
          setServerError(errorData.message);
        }

        return;
      }

      // Success handling
      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <div role="alert" className="error-banner">
          {serverError}
        </div>
      )}
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Form Reset and Default Values

```tsx
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

function EditProfileForm({ userId }: { userId: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Load existing data
  useEffect(() => {
    async function loadProfile() {
      const response = await fetch(`/api/users/${userId}`);
      const profile = await response.json();

      // Reset form with fetched data
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        country: profile.country,
      });
    }

    loadProfile();
  }, [userId, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfile(userId, data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <div className="form-actions">
        <button
          type="button"
          onClick={() => reset()}
          disabled={!isDirty}
        >
          Reset
        </button>
        <button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
```

## Performance Optimization

### Watch vs GetValues

```tsx
function OptimizedForm() {
  const { register, handleSubmit, watch, getValues } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // watch() causes re-renders when values change - use sparingly
  const watchedField = watch('conditionalField');

  // getValues() doesn't cause re-renders - use for one-time reads
  const handleCustomAction = () => {
    const currentValues = getValues();
    console.log('Current form state:', currentValues);
  };

  // Watch specific fields only
  const [firstName, lastName] = watch(['firstName', 'lastName']);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Only re-renders when conditionalField changes */}
      {watchedField === 'showExtra' && <ExtraFields />}
    </form>
  );
}
```

### Controlled Components with Controller

For custom components that don't work with `register`, use `Controller`:

```tsx
import { Controller, useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import Select from 'react-select';

const schema = z.object({
  birthDate: z.date(),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
});

type FormData = z.infer<typeof schema>;

function ControlledForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const skillOptions = [
    { value: 'react', label: 'React' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'nodejs', label: 'Node.js' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="birthDate"
        control={control}
        render={({ field }) => (
          <DatePicker
            selected={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      {errors.birthDate && <span>{errors.birthDate.message}</span>}

      <Controller
        name="skills"
        control={control}
        render={({ field }) => (
          <Select
            isMulti
            options={skillOptions}
            value={skillOptions.filter((opt) => field.value?.includes(opt.value))}
            onChange={(selected) => field.onChange(selected.map((s) => s.value))}
            onBlur={field.onBlur}
          />
        )}
      />
      {errors.skills && <span>{errors.skills.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Testing Type-Safe Forms

### Unit Testing Schemas

```typescript
import { describe, it, expect } from 'vitest';

describe('loginSchema', () => {
  it('should validate correct data', () => {
    const validData = {
      email: 'user@example.com',
      password: 'securePassword123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'securePassword123',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email');
    }
  });

  it('should reject short password', () => {
    const invalidData = {
      email: 'user@example.com',
      password: 'short',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password');
    }
  });
});
```

### Integration Testing Forms

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

describe('LoginForm', () => {
  it('should show validation errors for empty submission', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should submit valid form data', async () => {
    const mockSubmit = vi.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securePassword123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'securePassword123',
        rememberMe: false,
      });
    });
  });

  it('should show error for invalid email format', async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'securePassword123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
});
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Schema Definition** | Zod schemas with TypeScript inference via `z.infer<typeof schema>` |
| **Form Hook** | `useForm` with `zodResolver` for automatic validation |
| **Field Registration** | `register()` for native inputs, `Controller` for custom components |
| **Error Handling** | Access errors via `formState.errors`, display with `error.message` |
| **Conditional Fields** | `watch()` to observe values, discriminated unions for type safety |
| **Dynamic Arrays** | `useFieldArray` for add/remove functionality |
| **Async Validation** | `z.refine()` with async functions, debounce for UX |
| **Server Errors** | `setError()` to programmatically set field errors |
| **Performance** | Uncontrolled inputs, selective watching, proper component splitting |
| **Testing** | Schema unit tests with `safeParse()`, integration tests with Testing Library |

React Hook Form and Zod together provide a robust foundation for building forms that are type-safe at compile time and validated at runtime. The combination of Zod's schema-first approach and React Hook Form's performance-optimized architecture makes it easier to build complex forms while maintaining confidence in data integrity throughout your application.

The key benefits include automatic TypeScript type inference from schemas, declarative validation rules, minimal boilerplate, excellent performance through uncontrolled components, and a great developer experience with IDE autocomplete and compile-time error checking.
