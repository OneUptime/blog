# How to Implement Accessible Forms in React with ARIA Attributes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, Accessibility, ARIA, Forms, A11y, Frontend

Description: A comprehensive guide to building inclusive, screen-reader-friendly forms in React using ARIA attributes, semantic HTML, and accessibility best practices.

---

It's 9 AM. A user navigates to your sign-up form. They're using a screen reader because they're visually impaired. They tab through your form, but the error messages don't announce. Required fields aren't indicated. The submit button click does nothing visible to them. They leave, frustrated.

This happens millions of times daily across the web. According to the WHO, over 1 billion people live with some form of disability. In the US alone, the CDC reports that 1 in 4 adults has a disability. Your forms aren't just excluding users- they're potentially violating accessibility laws like the ADA, Section 508, and the European Accessibility Act.

The good news: React makes building accessible forms straightforward once you understand ARIA (Accessible Rich Internet Applications) attributes and semantic HTML patterns. This guide walks you through everything you need to build forms that work for everyone.

## Why Accessibility Matters for Forms

Forms are the gatekeepers of the web. Sign-ups, checkouts, searches, contact forms- they're how users interact with your product. An inaccessible form is a locked door.

**Business case:**
- 15-20% of your potential users have some form of disability
- Accessible sites rank better in SEO (semantic HTML helps crawlers)
- Legal compliance (lawsuits against inaccessible websites increased 300% since 2018)
- Better UX for everyone (clear labels, error handling, keyboard navigation)

**Technical case:**
- Screen readers need programmatic relationships, not visual ones
- Keyboard users need focus management
- Users with cognitive disabilities need clear, consistent patterns
- Voice control users need labeled elements

---

## Understanding ARIA: The Basics

ARIA stands for Accessible Rich Internet Applications. It's a set of HTML attributes that provide additional semantics to assistive technologies. Think of ARIA as a translation layer between your UI and screen readers.

### The First Rule of ARIA

> **No ARIA is better than bad ARIA.**

ARIA should supplement, not replace, native HTML semantics. A `<button>` is always better than a `<div role="button">`. Native elements come with built-in keyboard handling, focus management, and screen reader support.

Use ARIA when:
- Native HTML doesn't express the relationship (e.g., error messages linked to inputs)
- You're building custom widgets (e.g., autocomplete, date picker)
- You need to communicate dynamic state changes

### ARIA Categories

ARIA attributes fall into three categories:

1. **Roles**: Define what an element is (`role="alert"`, `role="dialog"`)
2. **Properties**: Define attributes that won't change (`aria-labelledby`, `aria-describedby`)
3. **States**: Define attributes that will change (`aria-expanded`, `aria-checked`, `aria-invalid`)

---

## Setting Up an Accessible Form Foundation

Let's build a comprehensive registration form step by step. We'll start with the foundation and add accessibility features progressively.

### Basic Form Structure

```tsx
import React, { useState } from 'react';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  newsletter: boolean;
  role: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  phone?: string;
  role?: string;
}

const RegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    newsletter: false,
    role: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="form-title"
      aria-describedby="form-description"
      noValidate
    >
      <h1 id="form-title">Create Your Account</h1>
      <p id="form-description">
        Fill out the form below to create your account. Fields marked with * are required.
      </p>

      {/* Form fields go here */}

    </form>
  );
};
```

**Key accessibility features:**
- `aria-labelledby`: Links the form to its heading for screen readers
- `aria-describedby`: Provides additional context about the form
- `noValidate`: Disables browser validation so we can implement accessible custom validation

---

## Accessible Text Inputs

Text inputs are the most common form element. Here's how to make them fully accessible.

### The Accessible Input Pattern

```tsx
interface AccessibleInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  helpText?: string;
  autoComplete?: string;
}

const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  helpText,
  autoComplete,
}) => {
  const errorId = `${id}-error`;
  const helpTextId = `${id}-help`;

  // Build aria-describedby dynamically
  const describedBy = [
    helpText ? helpTextId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="required-indicator"> *</span>
        )}
        {required && (
          <span className="visually-hidden">(required)</span>
        )}
      </label>

      {helpText && (
        <p id={helpTextId} className="help-text">
          {helpText}
        </p>
      )}

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
      />

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

### Breaking Down the Accessibility Features

**1. Explicit Label Association**

```tsx
<label htmlFor={id}>{label}</label>
<input id={id} />
```

The `htmlFor` attribute creates a programmatic link between label and input. Screen readers announce the label when the input receives focus. This is non-negotiable.

**2. Required Field Indication**

```tsx
{required && (
  <span aria-hidden="true" className="required-indicator"> *</span>
)}
{required && (
  <span className="visually-hidden">(required)</span>
)}
```

We use two elements:
- A visual asterisk hidden from screen readers (`aria-hidden="true"`)
- A screen-reader-only text "(required)" using a visually hidden class

This prevents screen readers from announcing "asterisk" and instead announces "required."

**3. The `aria-required` Attribute**

```tsx
<input aria-required={required} />
```

This tells assistive technologies that the field must be filled out. Different from the HTML `required` attribute which triggers browser validation.

**4. Error State with `aria-invalid`**

```tsx
<input aria-invalid={error ? true : undefined} />
```

When an error exists, `aria-invalid="true"` signals to screen readers that the current value is invalid. Important: set to `undefined` (not `false`) when valid to avoid announcing "invalid: false."

**5. Linking Descriptions with `aria-describedby`**

```tsx
<input aria-describedby={describedBy} />
```

This links the input to both help text and error messages. Screen readers announce these when the field receives focus, giving users context.

**6. Live Error Announcements**

```tsx
<p role="alert">{error}</p>
```

The `role="alert"` creates a live region that immediately announces content changes to screen readers. When an error appears, it's spoken automatically.

---

## The Visually Hidden Utility Class

You'll need this CSS class repeatedly for screen-reader-only content:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

This hides content visually while keeping it accessible to screen readers. Never use `display: none` or `visibility: hidden` for content you want screen readers to announce.

---

## Accessible Password Fields

Password fields have additional accessibility requirements: show/hide toggles and strength indicators.

```tsx
interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  showStrengthIndicator?: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  showStrengthIndicator = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;
  const strengthId = `${id}-strength`;

  const getPasswordStrength = (pwd: string): { level: string; score: number } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    const levels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return { level: levels[Math.min(score, 4)], score };
  };

  const strength = getPasswordStrength(value);

  const describedBy = [
    showStrengthIndicator && value ? strengthId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="visually-hidden">(required)</span>}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <div className="password-input-wrapper">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-pressed={showPassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="password-toggle"
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {showStrengthIndicator && value && (
        <div
          id={strengthId}
          className="password-strength"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="visually-hidden">Password strength:</span>
          <meter
            value={strength.score}
            min={0}
            max={4}
            low={1}
            high={3}
            optimum={4}
            aria-hidden="true"
          />
          <span aria-hidden="true">{strength.level}</span>
          <span className="visually-hidden">{strength.level}</span>
        </div>
      )}

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

**Key features:**

**1. Toggle Button Accessibility**

```tsx
<button
  type="button"
  aria-pressed={showPassword}
  aria-label={showPassword ? 'Hide password' : 'Show password'}
>
```

- `type="button"` prevents form submission
- `aria-pressed` indicates toggle state
- `aria-label` provides context for the action

**2. Strength Indicator with Live Region**

```tsx
<div aria-live="polite" aria-atomic="true">
```

- `aria-live="polite"` announces changes without interrupting current speech
- `aria-atomic="true"` announces the entire region, not just changes

---

## Accessible Select Dropdowns

Native `<select>` elements are already quite accessible. Here's how to enhance them:

```tsx
interface AccessibleSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder,
}) => {
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="visually-hidden">(required)</span>}
        {required && <span aria-hidden="true"> *</span>}
      </label>

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

**Important note on custom dropdowns:**

If you need a custom-styled dropdown, consider using a library like Headless UI, Radix UI, or React Aria. Building an accessible custom dropdown from scratch requires managing:
- Keyboard navigation (arrow keys, home, end, type-ahead)
- Focus management
- ARIA attributes (listbox, option, combobox patterns)
- Screen reader announcements

The complexity is substantial. Use tested libraries.

---

## Accessible Checkboxes and Radio Buttons

### Single Checkbox

```tsx
interface AccessibleCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  helpText?: string;
}

const AccessibleCheckbox: React.FC<AccessibleCheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
  error,
  helpText,
}) => {
  const errorId = `${id}-error`;
  const helpTextId = `${id}-help`;

  const describedBy = [
    helpText ? helpTextId : null,
    error ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field checkbox-field">
      <div className="checkbox-wrapper">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <label htmlFor={id}>{label}</label>
      </div>

      {helpText && (
        <p id={helpTextId} className="help-text">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

### Radio Button Group

Radio buttons should be grouped in a `fieldset` with a `legend`:

```tsx
interface RadioOption {
  value: string;
  label: string;
}

interface AccessibleRadioGroupProps {
  name: string;
  legend: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

const AccessibleRadioGroup: React.FC<AccessibleRadioGroupProps> = ({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  required = false,
}) => {
  const errorId = `${name}-error`;

  return (
    <fieldset
      className="form-field radio-group"
      aria-required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend>
        {legend}
        {required && <span className="visually-hidden">(required)</span>}
        {required && <span aria-hidden="true"> *</span>}
      </legend>

      <div className="radio-options">
        {options.map((option) => (
          <div key={option.value} className="radio-option">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <label htmlFor={`${name}-${option.value}`}>
              {option.label}
            </label>
          </div>
        ))}
      </div>

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};
```

**Why `fieldset` and `legend`?**

Screen readers announce the legend before each radio button, providing context. Without it, users hear "Marketing, radio button" instead of "What's your role? Marketing, radio button."

---

## Form Validation and Error Handling

Accessible form validation requires careful attention to when and how errors are communicated.

### Validation Strategy

```tsx
const validateForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  // Confirm password
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Name validation
  if (!data.name) {
    errors.name = 'Name is required';
  }

  // Phone validation (optional but must be valid if provided)
  if (data.phone && !/^\+?[\d\s-]{10,}$/.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Role validation
  if (!data.role) {
    errors.role = 'Please select a role';
  }

  return errors;
};
```

### Error Summary Component

When forms have multiple errors, provide a summary at the top:

```tsx
interface ErrorSummaryProps {
  errors: FormErrors;
  focusOnMount?: boolean;
}

const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  focusOnMount = true
}) => {
  const summaryRef = useRef<HTMLDivElement>(null);
  const errorEntries = Object.entries(errors).filter(([, value]) => value);

  useEffect(() => {
    if (focusOnMount && errorEntries.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [errorEntries.length, focusOnMount]);

  if (errorEntries.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      aria-labelledby="error-summary-title"
      className="error-summary"
      tabIndex={-1}
    >
      <h2 id="error-summary-title">
        There {errorEntries.length === 1 ? 'is 1 error' : `are ${errorEntries.length} errors`} in your submission
      </h2>
      <ul>
        {errorEntries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} onClick={(e) => {
              e.preventDefault();
              document.getElementById(field)?.focus();
            }}>
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**Key features:**

1. **Focus management**: The summary receives focus after submission, ensuring screen readers announce it
2. **`tabIndex={-1}`**: Makes the div programmatically focusable without adding it to the tab order
3. **Linked errors**: Each error links to its field, helping users navigate directly to problems

### Form Submission Handler

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const validationErrors = validateForm(formData);
  setErrors(validationErrors);

  if (Object.keys(validationErrors).length > 0) {
    // Focus the error summary
    return;
  }

  setIsSubmitting(true);
  setSubmitStatus('idle');

  try {
    // API call here
    await submitRegistration(formData);
    setSubmitStatus('success');

    // Announce success to screen readers
    announceToScreenReader('Registration successful. Redirecting to dashboard.');

  } catch (error) {
    setSubmitStatus('error');
    announceToScreenReader('Registration failed. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Live Region for Dynamic Announcements

```tsx
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'visually-hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};
```

---

## Accessible Submit Buttons

```tsx
interface SubmitButtonProps {
  isSubmitting: boolean;
  label?: string;
  loadingLabel?: string;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  label = 'Submit',
  loadingLabel = 'Submitting...',
}) => {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      aria-disabled={isSubmitting}
      aria-busy={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
};
```

**Key attributes:**

- **`aria-disabled`**: Communicates disabled state to assistive technologies
- **`aria-busy`**: Indicates the button is performing an action
- **Dynamic label**: Changes from "Submit" to "Submitting..." for feedback

---

## Focus Management

Proper focus management is critical for keyboard and screen reader users.

### Focus on First Error

```tsx
const focusFirstError = (errors: FormErrors) => {
  const firstErrorField = Object.keys(errors)[0];
  if (firstErrorField) {
    const element = document.getElementById(firstErrorField);
    element?.focus();
  }
};
```

### Focus Trap for Modals

If your form is in a modal, you need a focus trap:

```tsx
import { useEffect, useRef } from 'react';

const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
};
```

---

## Complete Form Example

Here's the complete, accessible registration form:

```tsx
import React, { useState, useRef, useEffect } from 'react';

// ... (all component definitions from above)

const CompleteRegistrationForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    newsletter: false,
    role: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showErrors, setShowErrors] = useState(false);

  const handleChange = (field: keyof FormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts fixing it
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    setShowErrors(true);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { value: 'developer', label: 'Developer' },
    { value: 'designer', label: 'Designer' },
    { value: 'manager', label: 'Manager' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <main>
      <form
        onSubmit={handleSubmit}
        aria-labelledby="form-title"
        aria-describedby="form-description"
        noValidate
      >
        <h1 id="form-title">Create Your Account</h1>
        <p id="form-description">
          Fill out the form below to create your account.
          Fields marked with * are required.
        </p>

        {showErrors && Object.keys(errors).length > 0 && (
          <ErrorSummary errors={errors} />
        )}

        {submitStatus === 'success' && (
          <div role="status" className="success-message">
            Registration successful! Check your email to verify your account.
          </div>
        )}

        {submitStatus === 'error' && (
          <div role="alert" className="error-message">
            Registration failed. Please try again later.
          </div>
        )}

        <AccessibleInput
          id="name"
          label="Full Name"
          value={formData.name}
          onChange={handleChange('name')}
          error={errors.name}
          required
          autoComplete="name"
        />

        <AccessibleInput
          id="email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
          helpText="We'll never share your email with anyone else."
          autoComplete="email"
        />

        <PasswordField
          id="password"
          label="Password"
          value={formData.password}
          onChange={handleChange('password')}
          error={errors.password}
          required
          showStrengthIndicator
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
          required
        />

        <AccessibleInput
          id="phone"
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
          helpText="Optional. Used for account recovery only."
          autoComplete="tel"
        />

        <AccessibleSelect
          id="role"
          label="Your Role"
          value={formData.role}
          onChange={handleChange('role')}
          options={roleOptions}
          error={errors.role}
          required
          placeholder="Select your role"
        />

        <AccessibleCheckbox
          id="newsletter"
          label="Subscribe to our newsletter"
          checked={formData.newsletter}
          onChange={handleChange('newsletter')}
          helpText="Get weekly tips and product updates. Unsubscribe anytime."
        />

        <SubmitButton
          isSubmitting={isSubmitting}
          label="Create Account"
          loadingLabel="Creating account..."
        />
      </form>
    </main>
  );
};

export default CompleteRegistrationForm;
```

---

## Testing Accessibility

### Manual Testing Checklist

1. **Keyboard Navigation**
   - Can you tab through all interactive elements?
   - Is the focus order logical?
   - Can you submit the form with Enter?
   - Can you activate buttons with Space/Enter?

2. **Screen Reader Testing**
   - Are all labels announced?
   - Are required fields indicated?
   - Are errors announced when they appear?
   - Is the form structure clear?

3. **Visual Testing**
   - Is focus visible on all elements?
   - Is there sufficient color contrast?
   - Do error states have non-color indicators?

### Automated Testing with jest-axe

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('RegistrationForm', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<CompleteRegistrationForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Testing with React Testing Library

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('RegistrationForm Accessibility', () => {
  it('shows error summary on invalid submission', async () => {
    render(<CompleteRegistrationForm />);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitButton);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/there are \d+ errors/i)).toBeInTheDocument();
  });

  it('associates labels with inputs', () => {
    render(<CompleteRegistrationForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('id');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('announces errors to screen readers', async () => {
    render(<CompleteRegistrationForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    await userEvent.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitButton);

    const errorMessage = screen.getByText(/please enter a valid email/i);
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});
```

---

## Common ARIA Patterns Summary

| Pattern | Use Case | Key Attributes |
|---------|----------|----------------|
| Text Input | Standard form fields | `aria-required`, `aria-invalid`, `aria-describedby` |
| Password Toggle | Show/hide password | `aria-pressed`, `aria-label` |
| Select/Dropdown | Choosing from options | `aria-required`, `aria-invalid`, `aria-describedby` |
| Checkbox | Boolean options | `aria-invalid`, `aria-describedby` |
| Radio Group | Mutually exclusive options | `fieldset`, `legend`, `aria-required` |
| Error Message | Validation feedback | `role="alert"`, linked via `aria-describedby` |
| Error Summary | Multiple errors | `role="alert"`, `tabIndex={-1}`, `aria-labelledby` |
| Loading State | Async operations | `aria-busy`, `aria-disabled` |
| Help Text | Additional context | Linked via `aria-describedby` |
| Live Region | Dynamic announcements | `aria-live`, `aria-atomic` |

---

## ARIA Attributes Quick Reference

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `aria-label` | Provides accessible name | String |
| `aria-labelledby` | References element that labels | ID(s) |
| `aria-describedby` | References descriptive element | ID(s) |
| `aria-required` | Indicates required field | `true` / `false` |
| `aria-invalid` | Indicates validation error | `true` / `false` / `grammar` / `spelling` |
| `aria-disabled` | Indicates disabled state | `true` / `false` |
| `aria-busy` | Indicates element is being updated | `true` / `false` |
| `aria-live` | Creates live region | `polite` / `assertive` / `off` |
| `aria-atomic` | Announce entire region on change | `true` / `false` |
| `aria-pressed` | Toggle button state | `true` / `false` / `mixed` |
| `aria-expanded` | Expandable element state | `true` / `false` |
| `aria-hidden` | Hide from assistive tech | `true` / `false` |
| `role` | Override semantic role | Various (alert, status, etc.) |

---

## Common Mistakes to Avoid

1. **Using placeholders instead of labels**
   - Placeholders disappear when typing, leaving users without context
   - Always use `<label>` elements

2. **Relying on color alone for errors**
   - Color-blind users may not distinguish red from other colors
   - Use icons, text, and border changes alongside color

3. **Missing focus styles**
   - Keyboard users need visible focus indicators
   - Never use `outline: none` without a replacement

4. **Forgetting `autocomplete` attributes**
   - Password managers and browsers rely on these
   - Use standard values: `email`, `password`, `name`, `tel`

5. **Using `div` instead of `button`**
   - Native buttons have built-in keyboard handling
   - If you must use a div, add `role="button"`, `tabIndex={0}`, and keyboard handlers

6. **Not announcing dynamic content**
   - AJAX errors need live regions to be announced
   - Use `role="alert"` or `aria-live`

7. **Breaking keyboard navigation**
   - Tab order should follow visual order
   - Don't trap focus unintentionally

8. **Generic error messages**
   - "Invalid input" doesn't help anyone
   - Be specific: "Password must be at least 8 characters"

---

## Resources and Tools

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/) - Browser extension for accessibility audits
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [NVDA](https://www.nvaccess.org/) - Free screen reader for Windows
- [VoiceOver](https://www.apple.com/accessibility/vision/) - Built-in screen reader for macOS/iOS

**Libraries:**
- [React Aria](https://react-spectrum.adobe.com/react-aria/) - Adobe's accessibility primitives
- [Radix UI](https://www.radix-ui.com/) - Unstyled, accessible components
- [Headless UI](https://headlessui.com/) - Unstyled, accessible components by Tailwind

**Documentation:**
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - Official patterns guide
- [MDN ARIA Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [A11y Project](https://www.a11yproject.com/) - Community-driven accessibility resources

---

## Conclusion

Building accessible forms in React isn't just about compliance- it's about creating inclusive experiences that work for everyone. The patterns in this guide cover the majority of form accessibility needs:

1. **Use semantic HTML first** - Native elements are your foundation
2. **Label everything** - Programmatic associations, not just visual proximity
3. **Communicate state** - Required fields, errors, and loading states
4. **Manage focus** - Guide users through the form logically
5. **Test with real tools** - Screen readers, keyboard-only, automated tests

Start with these patterns, test with real assistive technologies, and iterate. Your users- all of them- will thank you.

---

**Related Reading:**
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [The A11y Project Checklist](https://www.a11yproject.com/checklist/)
