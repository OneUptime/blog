# How to Use TypeScript Discriminated Unions for React Component Props

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, TypeScript, Discriminated Unions, Props, Type Safety, Patterns

Description: Learn how to leverage TypeScript discriminated unions to create type-safe, self-documenting React components with mutually exclusive prop combinations and exhaustive pattern matching.

---

Building robust React applications requires more than just functional components - it demands type-safe interfaces that prevent invalid prop combinations at compile time. TypeScript discriminated unions provide a powerful pattern for defining component APIs where certain props are mutually exclusive or conditionally required based on a discriminant property.

This guide covers the patterns, techniques, and real-world applications of discriminated unions in React component design.

## Understanding Discriminated Unions

A discriminated union (also called a tagged union or algebraic data type) is a TypeScript pattern where multiple types share a common property - the discriminant - that TypeScript uses to narrow the type.

```typescript
// Basic discriminated union
type Circle = {
  kind: 'circle';
  radius: number;
};

type Rectangle = {
  kind: 'rectangle';
  width: number;
  height: number;
};

type Shape = Circle | Rectangle;

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      // TypeScript knows shape is Circle here
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      // TypeScript knows shape is Rectangle here
      return shape.width * shape.height;
  }
}
```

The `kind` property serves as the discriminant. When you check its value, TypeScript automatically narrows the type, giving you access to the specific properties of that variant.

## Why Discriminated Unions for React Props?

React components often need to support multiple "modes" or "variants" where different sets of props apply. Without discriminated unions, you end up with:

```typescript
// Without discriminated unions - problematic approach
type ButtonProps = {
  onClick?: () => void;
  href?: string;
  target?: string;
  disabled?: boolean;
  loading?: boolean;
};

// Problem: Nothing prevents invalid combinations
<Button href="/about" disabled={true} /> // Should this work?
<Button onClick={() => {}} href="/about" /> // Which behavior wins?
<Button target="_blank" /> // Missing href!
```

This approach has several issues:

1. **Invalid combinations are allowed**: Users can pass conflicting props
2. **Missing required props**: The `target` prop makes sense only with `href`
3. **Unclear component behavior**: Does the component render an `<a>` or `<button>`?
4. **Runtime errors instead of compile-time errors**: Bugs surface during testing, not development

Discriminated unions solve all of these problems by making invalid states unrepresentable.

## Basic Pattern: Button Component with Variants

Let's build a Button component that can render as either a `<button>` element or an `<a>` (link) element:

```typescript
import React from 'react';

// Base props shared by all variants
type BaseButtonProps = {
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
};

// Button variant - renders as <button>
type ButtonElementProps = BaseButtonProps & {
  as: 'button';
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

// Link variant - renders as <a>
type LinkElementProps = BaseButtonProps & {
  as: 'link';
  href: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
};

// The discriminated union
type ButtonProps = ButtonElementProps | LinkElementProps;

export function Button(props: ButtonProps) {
  const { as, children, className, size = 'medium' } = props;

  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const baseClasses = `${sizeClasses[size]} ${className || ''}`;

  if (as === 'link') {
    // TypeScript narrows props to LinkElementProps
    const { href, target, rel } = props;

    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? rel || 'noopener noreferrer' : rel}
        className={baseClasses}
      >
        {children}
      </a>
    );
  }

  // TypeScript narrows props to ButtonElementProps
  const { onClick, disabled, loading, type = 'button' } = props;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
```

Now TypeScript enforces the correct props for each variant:

```typescript
// Valid usage
<Button as="button" onClick={() => console.log('clicked')}>
  Click Me
</Button>

<Button as="link" href="/about" target="_blank">
  About Us
</Button>

// TypeScript errors - invalid combinations
<Button as="button" href="/about">  // Error: href doesn't exist on ButtonElementProps
  Invalid
</Button>

<Button as="link" onClick={() => {}}>  // Error: onClick doesn't exist on LinkElementProps
  Invalid
</Button>

<Button as="link">  // Error: href is required
  Missing href
</Button>
```

## Advanced Pattern: Multiple Discriminants

Sometimes you need more than one level of discrimination. Consider an Alert component that varies by both severity and dismissibility:

```typescript
import React, { useState } from 'react';

// Severity variants
type InfoAlert = {
  severity: 'info';
  icon?: React.ReactNode;
};

type WarningAlert = {
  severity: 'warning';
  icon?: React.ReactNode;
  acknowledgeable?: boolean;
};

type ErrorAlert = {
  severity: 'error';
  icon?: React.ReactNode;
  retryAction?: () => void;
  retryLabel?: string;
};

type SuccessAlert = {
  severity: 'success';
  icon?: React.ReactNode;
  autoHideDuration?: number;
};

type SeverityProps = InfoAlert | WarningAlert | ErrorAlert | SuccessAlert;

// Dismissibility variants
type DismissibleAlert = {
  dismissible: true;
  onDismiss: () => void;
  dismissLabel?: string;
};

type PersistentAlert = {
  dismissible?: false;
};

type DismissibilityProps = DismissibleAlert | PersistentAlert;

// Base props
type BaseAlertProps = {
  title: string;
  message: string;
  className?: string;
};

// Combine all variants
type AlertProps = BaseAlertProps & SeverityProps & DismissibilityProps;

export function Alert(props: AlertProps) {
  const { title, message, className, severity, dismissible } = props;

  const severityStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  return (
    <div className={`border rounded-lg p-4 ${severityStyles[severity]} ${className || ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p>{message}</p>

          {/* Severity-specific content */}
          {severity === 'error' && props.retryAction && (
            <button
              onClick={props.retryAction}
              className="mt-2 text-sm underline"
            >
              {props.retryLabel || 'Retry'}
            </button>
          )}

          {severity === 'warning' && props.acknowledgeable && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" />
              I understand
            </label>
          )}
        </div>

        {/* Dismissibility-specific content */}
        {dismissible && (
          <button
            onClick={props.onDismiss}
            className="text-sm"
            aria-label={props.dismissLabel || 'Dismiss'}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
```

Usage examples showing the type safety:

```typescript
// Valid combinations
<Alert
  severity="error"
  title="Connection Failed"
  message="Unable to connect to server"
  retryAction={() => reconnect()}
  dismissible={true}
  onDismiss={() => setVisible(false)}
/>

<Alert
  severity="success"
  title="Saved"
  message="Your changes have been saved"
  autoHideDuration={3000}
/>

// TypeScript errors
<Alert
  severity="info"
  title="Note"
  message="Just so you know"
  retryAction={() => {}}  // Error: retryAction doesn't exist on InfoAlert
/>

<Alert
  severity="error"
  title="Error"
  message="Something went wrong"
  dismissible={true}
  // Error: onDismiss is required when dismissible is true
/>
```

## Pattern: Conditional Props with Type Predicates

For more complex conditional logic, type predicates provide explicit type guards:

```typescript
import React from 'react';

type WithPagination = {
  paginated: true;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
};

type WithoutPagination = {
  paginated?: false;
};

type PaginationProps = WithPagination | WithoutPagination;

type DataTableProps<T> = {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
  onRowClick?: (row: T) => void;
} & PaginationProps;

// Type predicate for narrowing
function isPaginated(props: PaginationProps): props is WithPagination {
  return props.paginated === true;
}

export function DataTable<T extends Record<string, unknown>>(
  props: DataTableProps<T>
) {
  const { data, columns, onRowClick } = props;

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination controls */}
      {isPaginated(props) && (
        <div className="flex justify-between items-center mt-4">
          <span>
            Page {props.currentPage} of {props.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={props.currentPage === 1}
              onClick={() => props.onPageChange(props.currentPage - 1)}
            >
              Previous
            </button>
            <button
              disabled={props.currentPage === props.totalPages}
              onClick={() => props.onPageChange(props.currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Pattern: Form Field Components

Form fields are excellent candidates for discriminated unions because different input types require different props:

```typescript
import React from 'react';

type BaseFieldProps = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

type TextFieldProps = BaseFieldProps & {
  type: 'text' | 'email' | 'password' | 'url' | 'tel';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  pattern?: string;
};

type NumberFieldProps = BaseFieldProps & {
  type: 'number';
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
};

type SelectFieldProps = BaseFieldProps & {
  type: 'select';
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

type CheckboxFieldProps = BaseFieldProps & {
  type: 'checkbox';
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
};

type TextAreaFieldProps = BaseFieldProps & {
  type: 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
};

type DateFieldProps = BaseFieldProps & {
  type: 'date';
  value: Date | null;
  onChange: (value: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
};

// The discriminated union
type FormFieldProps =
  | TextFieldProps
  | NumberFieldProps
  | SelectFieldProps
  | CheckboxFieldProps
  | TextAreaFieldProps
  | DateFieldProps;

export function FormField(props: FormFieldProps) {
  const { name, label, error, required, disabled, type } = props;

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'url':
      case 'tel': {
        const { value, onChange, placeholder, maxLength, pattern } = props;
        return (
          <input
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            pattern={pattern}
            disabled={disabled}
            required={required}
            className="border rounded px-3 py-2 w-full"
          />
        );
      }

      case 'number': {
        const { value, onChange, min, max, step } = props;
        return (
          <input
            type="number"
            name={name}
            value={value ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === '' ? null : Number(val));
            }}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            required={required}
            className="border rounded px-3 py-2 w-full"
          />
        );
      }

      case 'select': {
        const { value, onChange, options, placeholder } = props;
        return (
          <select
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="border rounded px-3 py-2 w-full"
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      case 'checkbox': {
        const { checked, onChange, indeterminate } = props;
        return (
          <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            ref={(el) => {
              if (el) el.indeterminate = indeterminate || false;
            }}
            disabled={disabled}
            required={required}
            className="h-4 w-4"
          />
        );
      }

      case 'textarea': {
        const { value, onChange, placeholder, rows, maxLength, resize } = props;
        return (
          <textarea
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows || 3}
            maxLength={maxLength}
            disabled={disabled}
            required={required}
            style={{ resize: resize || 'vertical' }}
            className="border rounded px-3 py-2 w-full"
          />
        );
      }

      case 'date': {
        const { value, onChange, minDate, maxDate } = props;
        return (
          <input
            type="date"
            name={name}
            value={value ? value.toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val ? new Date(val) : null);
            }}
            min={minDate?.toISOString().split('T')[0]}
            max={maxDate?.toISOString().split('T')[0]}
            disabled={disabled}
            required={required}
            className="border rounded px-3 py-2 w-full"
          />
        );
      }
    }
  };

  const isCheckbox = type === 'checkbox';

  return (
    <div className={`mb-4 ${isCheckbox ? 'flex items-center gap-2' : ''}`}>
      {!isCheckbox && (
        <label className="block mb-1 font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderInput()}
      {isCheckbox && (
        <label className="font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
```

Usage with full type safety:

```typescript
// Text input - all text-specific props available
<FormField
  type="email"
  name="email"
  label="Email Address"
  value={email}
  onChange={setEmail}
  placeholder="you@example.com"
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
  required
/>

// Number input - number-specific props available
<FormField
  type="number"
  name="age"
  label="Age"
  value={age}
  onChange={setAge}
  min={0}
  max={150}
/>

// Select input - select-specific props required
<FormField
  type="select"
  name="country"
  label="Country"
  value={country}
  onChange={setCountry}
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ]}
  placeholder="Select a country"
/>

// TypeScript errors for invalid combinations
<FormField
  type="number"
  name="quantity"
  label="Quantity"
  value="not a number"  // Error: string not assignable to number | null
  onChange={setQuantity}
/>

<FormField
  type="text"
  name="username"
  label="Username"
  value={username}
  onChange={setUsername}
  min={0}  // Error: min doesn't exist on TextFieldProps
/>
```

## Pattern: Modal Components with Different Content Types

Modals often display different types of content that require different props:

```typescript
import React from 'react';

type BaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
};

type ConfirmationModalProps = BaseModalProps & {
  variant: 'confirmation';
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
};

type FormModalProps<T> = BaseModalProps & {
  variant: 'form';
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  children: (props: {
    values: T;
    setValues: React.Dispatch<React.SetStateAction<T>>;
    isSubmitting: boolean;
  }) => React.ReactNode;
};

type InformationalModalProps = BaseModalProps & {
  variant: 'informational';
  content: React.ReactNode;
  acknowledgeLabel?: string;
};

type CustomModalProps = BaseModalProps & {
  variant: 'custom';
  children: React.ReactNode;
  footer?: React.ReactNode;
};

type ModalProps<T = unknown> =
  | ConfirmationModalProps
  | FormModalProps<T>
  | InformationalModalProps
  | CustomModalProps;

export function Modal<T = unknown>(props: ModalProps<T>) {
  const { isOpen, onClose, title, size = 'medium', variant } = props;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formValues, setFormValues] = React.useState<T | null>(null);

  React.useEffect(() => {
    if (variant === 'form' && isOpen) {
      setFormValues(props.initialValues);
    }
  }, [isOpen, variant]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    fullscreen: 'max-w-full h-full',
  };

  const renderContent = () => {
    switch (variant) {
      case 'confirmation': {
        const { message, confirmLabel, cancelLabel, onConfirm, destructive } = props;
        return (
          <>
            <div className="p-4">
              <p>{message}</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded"
              >
                {cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 rounded text-white ${
                  destructive ? 'bg-red-600' : 'bg-blue-600'
                }`}
              >
                {confirmLabel || 'Confirm'}
              </button>
            </div>
          </>
        );
      }

      case 'form': {
        const { onSubmit, submitLabel, cancelLabel, children } = props;

        const handleSubmit = async () => {
          if (!formValues) return;
          setIsSubmitting(true);
          try {
            await onSubmit(formValues);
            onClose();
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <>
            <div className="p-4">
              {formValues &&
                children({
                  values: formValues,
                  setValues: setFormValues as React.Dispatch<React.SetStateAction<T>>,
                  isSubmitting,
                })}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border rounded"
              >
                {cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {isSubmitting ? 'Saving...' : submitLabel || 'Save'}
              </button>
            </div>
          </>
        );
      }

      case 'informational': {
        const { content, acknowledgeLabel } = props;
        return (
          <>
            <div className="p-4">{content}</div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {acknowledgeLabel || 'Got it'}
              </button>
            </div>
          </>
        );
      }

      case 'custom': {
        const { children, footer } = props;
        return (
          <>
            <div className="p-4">{children}</div>
            {footer && <div className="p-4 border-t">{footer}</div>}
          </>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className={`bg-white rounded-lg ${sizeClasses[size]}`}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close">
            X
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
```

## Pattern: Data Loading States

Components that fetch data often need to represent loading, error, and success states:

```typescript
import React from 'react';

type LoadingState = {
  status: 'loading';
  progress?: number;
};

type ErrorState = {
  status: 'error';
  error: Error;
  retry: () => void;
};

type SuccessState<T> = {
  status: 'success';
  data: T;
  lastUpdated: Date;
  refresh: () => void;
};

type EmptyState = {
  status: 'empty';
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type DataState<T> = LoadingState | ErrorState | SuccessState<T> | EmptyState;

type DataViewProps<T> = {
  state: DataState<T>;
  renderLoading?: (progress?: number) => React.ReactNode;
  renderError?: (error: Error, retry: () => void) => React.ReactNode;
  renderEmpty?: (message?: string, action?: { label: string; onClick: () => void }) => React.ReactNode;
  renderData: (data: T, refresh: () => void) => React.ReactNode;
};

export function DataView<T>(props: DataViewProps<T>) {
  const { state, renderLoading, renderError, renderEmpty, renderData } = props;

  switch (state.status) {
    case 'loading':
      if (renderLoading) {
        return <>{renderLoading(state.progress)}</>;
      }
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          {state.progress !== undefined && (
            <p className="mt-2 text-gray-600">{Math.round(state.progress)}%</p>
          )}
        </div>
      );

    case 'error':
      if (renderError) {
        return <>{renderError(state.error, state.retry)}</>;
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 text-4xl mb-2">!</div>
          <p className="text-gray-800 font-medium">Something went wrong</p>
          <p className="text-gray-600 text-sm mt-1">{state.error.message}</p>
          <button
            onClick={state.retry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      );

    case 'empty':
      if (renderEmpty) {
        return <>{renderEmpty(state.message, state.action)}</>;
      }
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-gray-600">
            {state.message || 'No data available'}
          </p>
          {state.action && (
            <button
              onClick={state.action.onClick}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              {state.action.label}
            </button>
          )}
        </div>
      );

    case 'success':
      return <>{renderData(state.data, state.refresh)}</>;
  }
}
```

Usage with a custom hook:

```typescript
function useDataState<T>(
  fetcher: () => Promise<T>
): [DataState<T>, () => void] {
  const [state, setState] = React.useState<DataState<T>>({ status: 'loading' });

  const load = React.useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await fetcher();
      if (Array.isArray(data) && data.length === 0) {
        setState({ status: 'empty' });
      } else {
        setState({
          status: 'success',
          data,
          lastUpdated: new Date(),
          refresh: load,
        });
      }
    } catch (e) {
      setState({
        status: 'error',
        error: e as Error,
        retry: load,
      });
    }
  }, [fetcher]);

  React.useEffect(() => {
    load();
  }, [load]);

  return [state, load];
}

// Usage in component
function UserList() {
  const [usersState] = useDataState(() => fetchUsers());

  return (
    <DataView
      state={usersState}
      renderData={(users, refresh) => (
        <div>
          <button onClick={refresh}>Refresh</button>
          <ul>
            {users.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        </div>
      )}
    />
  );
}
```

## Narrowing Techniques

TypeScript offers several ways to narrow discriminated unions within your components.

### Switch Statements

The most explicit approach - TypeScript performs exhaustiveness checking:

```typescript
function renderIcon(props: IconProps) {
  switch (props.variant) {
    case 'solid':
      return <SolidIcon name={props.name} color={props.color} />;
    case 'outline':
      return <OutlineIcon name={props.name} strokeWidth={props.strokeWidth} />;
    case 'duotone':
      return (
        <DuotoneIcon
          name={props.name}
          primaryColor={props.primaryColor}
          secondaryColor={props.secondaryColor}
        />
      );
    default:
      // TypeScript error if a variant is unhandled
      const _exhaustive: never = props;
      return _exhaustive;
  }
}
```

### If Statements with Type Guards

For binary or simple conditions:

```typescript
function Card(props: CardProps) {
  if (props.clickable) {
    // props is narrowed to ClickableCardProps
    return (
      <div onClick={props.onClick} className="cursor-pointer">
        {props.children}
      </div>
    );
  }

  // props is narrowed to NonClickableCardProps
  return <div>{props.children}</div>;
}
```

### Destructuring After Narrowing

Narrow first, then destructure for cleaner code:

```typescript
function Badge(props: BadgeProps) {
  if (props.variant === 'count') {
    const { count, max, showZero } = props;

    if (count === 0 && !showZero) return null;

    const display = max && count > max ? `${max}+` : count;
    return <span className="badge">{display}</span>;
  }

  if (props.variant === 'dot') {
    const { color, pulse } = props;
    return (
      <span
        className={`badge-dot ${pulse ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
    );
  }

  // variant === 'text'
  const { text, truncate } = props;
  return (
    <span className={`badge-text ${truncate ? 'truncate' : ''}`}>
      {text}
    </span>
  );
}
```

### In Operator Narrowing

Check for property existence when discriminants are optional:

```typescript
type WithIcon = {
  icon: React.ReactNode;
  iconPosition?: 'left' | 'right';
};

type WithoutIcon = {
  icon?: never;
};

type MenuItemProps = {
  label: string;
  onClick: () => void;
} & (WithIcon | WithoutIcon);

function MenuItem(props: MenuItemProps) {
  const { label, onClick } = props;

  // Use 'in' operator to check for icon
  if ('icon' in props && props.icon) {
    const position = props.iconPosition || 'left';
    return (
      <button onClick={onClick} className="menu-item">
        {position === 'left' && props.icon}
        <span>{label}</span>
        {position === 'right' && props.icon}
      </button>
    );
  }

  return (
    <button onClick={onClick} className="menu-item">
      {label}
    </button>
  );
}
```

## Exhaustiveness Checking

Ensure all variants are handled with the `never` type:

```typescript
type NotificationProps =
  | { type: 'toast'; message: string; duration: number }
  | { type: 'banner'; message: string; dismissible: boolean }
  | { type: 'inline'; message: string; icon: React.ReactNode };

function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}

function Notification(props: NotificationProps) {
  switch (props.type) {
    case 'toast':
      return <Toast message={props.message} duration={props.duration} />;
    case 'banner':
      return <Banner message={props.message} dismissible={props.dismissible} />;
    case 'inline':
      return <InlineAlert message={props.message} icon={props.icon} />;
    default:
      // If you add a new type and forget to handle it,
      // TypeScript will error here
      return assertNever(props);
  }
}
```

## Common Patterns Summary

| Pattern | Use Case | Discriminant | Example Props |
|---------|----------|--------------|---------------|
| **Element Variants** | Component renders different HTML elements | `as: 'button' \| 'link' \| 'div'` | Button, Card, Text |
| **Visual Variants** | Different visual styles with unique options | `variant: 'primary' \| 'outline' \| 'ghost'` | Button, Badge, Alert |
| **State Variants** | Data fetching states | `status: 'loading' \| 'error' \| 'success'` | DataView, AsyncContent |
| **Mode Variants** | Different operational modes | `mode: 'view' \| 'edit' \| 'create'` | Form, Modal, Panel |
| **Content Type** | Different content requires different config | `type: 'text' \| 'image' \| 'video'` | Card, MediaPlayer |
| **Conditional Features** | Optional feature with required sub-props | `feature: true` + required props | Pagination, Search |
| **Behavior Variants** | Different interaction patterns | `interactive: true \| false` | Card, ListItem |

## Best Practices

### 1. Keep the discriminant obvious

```typescript
// Good - clear discriminant property
type ButtonProps =
  | { as: 'button'; onClick: () => void }
  | { as: 'link'; href: string };

// Avoid - hidden or implicit discriminant
type ButtonProps =
  | { onClick: () => void }
  | { href: string };
```

### 2. Use literal types for discriminants

```typescript
// Good - literal types enable narrowing
type AlertProps =
  | { severity: 'error'; errorCode: number }
  | { severity: 'warning'; warningLevel: 'low' | 'high' };

// Avoid - string type doesn't narrow
type AlertProps =
  | { severity: string; errorCode: number }
  | { severity: string; warningLevel: string };
```

### 3. Extract shared props into a base type

```typescript
// Good - DRY and maintainable
type BaseInputProps = {
  name: string;
  label: string;
  error?: string;
};

type TextInputProps = BaseInputProps & {
  type: 'text';
  value: string;
};

type NumberInputProps = BaseInputProps & {
  type: 'number';
  value: number;
};
```

### 4. Use `never` for mutually exclusive props

```typescript
// Good - explicitly prevent invalid combinations
type WithHref = {
  href: string;
  onClick?: never;
};

type WithOnClick = {
  href?: never;
  onClick: () => void;
};

type LinkProps = WithHref | WithOnClick;
```

### 5. Document variants with JSDoc

```typescript
/**
 * Alert component props
 * @variant error - Shows error with optional retry action
 * @variant warning - Shows warning with optional acknowledgement
 * @variant info - Shows informational message
 */
type AlertProps = ErrorAlertProps | WarningAlertProps | InfoAlertProps;
```

## Debugging Tips

When TypeScript shows unexpected errors with discriminated unions:

1. **Hover over the type** - See what TypeScript infers at each point

2. **Check narrowing** - Ensure your conditional correctly narrows the type

3. **Verify discriminant values** - Literal types must match exactly

4. **Use type assertions sparingly** - If you need `as`, the types may be wrong

5. **Test with explicit type annotations** - Temporarily annotate to find mismatches

```typescript
// Debug by adding explicit annotation
const buttonProps: ButtonElementProps = {
  as: 'button',
  onClick: () => {},
  // TypeScript will error if any required prop is missing
};
```

## Summary

Discriminated unions transform how you design React component APIs. Instead of permissive interfaces that allow invalid combinations, you define precise variants where TypeScript guarantees correctness at compile time.

| Benefit | Without Discriminated Unions | With Discriminated Unions |
|---------|------------------------------|---------------------------|
| **Invalid prop combinations** | Allowed - caught at runtime | Prevented - caught at compile time |
| **Required conditional props** | Easy to forget | Enforced by TypeScript |
| **Component behavior** | Ambiguous from props | Clear from discriminant |
| **Autocomplete** | Shows all props | Shows only valid props |
| **Refactoring** | Error-prone | Safe with type checking |
| **Documentation** | Must read docs/code | Types are self-documenting |

The patterns covered here - element variants, state management, form fields, modals, and data loading - represent the most common use cases. Apply them to create components that are impossible to misuse, with APIs that guide developers toward correct usage through the type system itself.
