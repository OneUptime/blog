# How to Create Type-Safe Forms in React Native with React Hook Form

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, React Hook Form, Forms, TypeScript, Validation, Mobile Development

Description: Learn how to build type-safe forms in React Native using React Hook Form with schema validation.

---

Forms in mobile applications require careful handling of user input, validation, and state management. React Hook Form provides a performant, flexible solution that integrates seamlessly with React Native and TypeScript. This guide covers everything from basic setup to advanced patterns for production-ready forms.

## Why React Hook Form for React Native

React Hook Form stands out for mobile development because of its performance characteristics. Unlike other form libraries that re-render on every keystroke, React Hook Form uses uncontrolled components and refs to minimize re-renders. This matters significantly on mobile devices where performance directly impacts user experience.

Key advantages include:
- Minimal re-renders through uncontrolled inputs
- Built-in TypeScript support with generic form types
- Small bundle size (around 9KB minified)
- No dependencies
- Flexible validation with schema libraries like Zod

## Installation and Setup

Start by installing the necessary packages:

```bash
npm install react-hook-form zod @hookform/resolvers
```

For Expo projects:

```bash
npx expo install react-hook-form zod @hookform/resolvers
```

## Basic Form Setup

Here is a simple form demonstrating core concepts:

```typescript
import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';

// Define the form data type
type LoginFormData = {
  email: string;
  password: string;
};

export function LoginForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('Form data:', data);
    // Handle login logic
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Email</Text>
      <Controller
        control={control}
        name="email"
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />
        )}
      />
      {errors.email && (
        <Text style={styles.errorText}>{errors.email.message}</Text>
      )}

      <Text style={styles.label}>Password</Text>
      <Controller
        control={control}
        name="password"
        rules={{
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            secureTextEntry
            placeholder="Enter your password"
          />
        )}
      />
      {errors.password && (
        <Text style={styles.errorText}>{errors.password.message}</Text>
      )}

      <Button
        title={isSubmitting ? 'Logging in...' : 'Login'}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 12,
  },
});
```

## TypeScript Form Typing

Strong typing ensures your forms are type-safe throughout your application. Define form types that match your API contracts:

```typescript
// types/forms.ts
export type UserProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date | null;
  preferences: {
    newsletter: boolean;
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
};

export type AddressFormData = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type RegistrationFormData = UserProfileFormData & {
  password: string;
  confirmPassword: string;
  address: AddressFormData;
  acceptTerms: boolean;
};
```

Use generics with `useForm` to enforce type safety:

```typescript
import { useForm, SubmitHandler } from 'react-hook-form';

function RegistrationScreen() {
  const { control, handleSubmit } = useForm<RegistrationFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: null,
      password: '',
      confirmPassword: '',
      preferences: {
        newsletter: false,
        notifications: true,
        theme: 'system',
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      acceptTerms: false,
    },
  });

  // TypeScript enforces correct data shape
  const onSubmit: SubmitHandler<RegistrationFormData> = async (data) => {
    // data is fully typed
    console.log(data.preferences.theme); // 'light' | 'dark' | 'system'
  };

  return <View>{/* Form fields */}</View>;
}
```

## Creating Reusable Input Components

Build a library of reusable form inputs that integrate with React Hook Form:

```typescript
// components/FormInput.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import {
  Control,
  Controller,
  FieldValues,
  Path,
  RegisterOptions,
} from 'react-hook-form';

type FormInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  rules?: RegisterOptions<T, Path<T>>;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
  numberOfLines?: number;
};

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View style={styles.container}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              error && styles.inputError,
            ]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder={placeholder}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            numberOfLines={numberOfLines}
          />
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
});
```

Create additional specialized inputs:

```typescript
// components/FormSelect.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

type Option = {
  label: string;
  value: string;
};

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: Option[];
  placeholder?: string;
};

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = 'Select an option',
}: FormSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, value },
        fieldState: { error },
      }) => (
        <View style={styles.container}>
          <Text style={styles.label}>{label}</Text>
          <View style={[styles.pickerContainer, error && styles.pickerError]}>
            <Picker
              selectedValue={value}
              onValueChange={onChange}
              style={styles.picker}
            >
              <Picker.Item label={placeholder} value="" />
              {options.map((option) => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                />
              ))}
            </Picker>
          </View>
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

// components/FormCheckbox.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

type FormCheckboxProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
};

export function FormCheckbox<T extends FieldValues>({
  control,
  name,
  label,
}: FormCheckboxProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, value },
        fieldState: { error },
      }) => (
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => onChange(!value)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{label}</Text>
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error.message}</Text>}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerError: {
    borderColor: '#e74c3c',
  },
  picker: {
    height: 50,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
});
```

## Zod Schema Validation

Zod provides runtime validation with excellent TypeScript inference. This is the recommended approach for complex validation logic:

```typescript
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Define the schema
const registrationSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  dateOfBirth: z
    .date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .refine(
      (date) => {
        const age = Math.floor(
          (Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
        return age >= 18;
      },
      { message: 'You must be at least 18 years old' }
    )
    .nullable(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Infer the type from the schema
type RegistrationFormData = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      dateOfBirth: null,
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    // data is validated and typed
    console.log('Valid registration data:', data);
  };

  return (
    <View>
      {/* Form fields using FormInput components */}
    </View>
  );
}
```

## Error Handling and Display

Create a comprehensive error display system:

```typescript
// components/FormError.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FieldError } from 'react-hook-form';

type FormErrorProps = {
  error?: FieldError;
};

export function FormError({ error }: FormErrorProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [error, fadeAnim]);

  if (!error) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.message}>{error.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  icon: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 14,
  },
  message: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
});

// hooks/useFormErrorHandler.ts
import { useCallback } from 'react';
import { FieldErrors } from 'react-hook-form';
import { Alert } from 'react-native';

export function useFormErrorHandler<T extends Record<string, unknown>>() {
  const handleFormErrors = useCallback((errors: FieldErrors<T>) => {
    const errorMessages = Object.entries(errors)
      .map(([field, error]) => {
        if (error && typeof error === 'object' && 'message' in error) {
          return `${field}: ${error.message}`;
        }
        return null;
      })
      .filter(Boolean);

    if (errorMessages.length > 0) {
      Alert.alert(
        'Validation Errors',
        errorMessages.join('\n'),
        [{ text: 'OK' }]
      );
    }
  }, []);

  return { handleFormErrors };
}
```

## Form State Management

React Hook Form provides extensive form state management:

```typescript
import React from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, useWatch, useFormState } from 'react-hook-form';

type ProfileFormData = {
  username: string;
  bio: string;
  website: string;
};

export function ProfileForm() {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    trigger,
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: '',
      bio: '',
      website: '',
    },
    mode: 'onChange', // Validate on change
  });

  // Subscribe to specific form state
  const { isDirty, isValid, isSubmitting, dirtyFields, touchedFields } =
    useFormState({ control });

  // Watch specific fields for reactive updates
  const username = useWatch({ control, name: 'username' });
  const bio = useWatch({ control, name: 'bio' });

  // Character count for bio
  const bioCharCount = bio?.length || 0;
  const maxBioLength = 160;

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await saveProfile(data);
      reset(data); // Reset form with new values (clears dirty state)
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handlePrefill = async () => {
    // Programmatically set values
    setValue('username', 'john_doe', { shouldValidate: true });
    setValue('bio', 'Software developer', { shouldDirty: true });
    setValue('website', 'https://example.com');
  };

  const handleValidateField = async () => {
    // Trigger validation for specific field
    const isUsernameValid = await trigger('username');
    console.log('Username valid:', isUsernameValid);
  };

  return (
    <View style={styles.container}>
      {/* Form fields */}

      <View style={styles.charCount}>
        <Text style={bioCharCount > maxBioLength ? styles.overLimit : undefined}>
          {bioCharCount}/{maxBioLength}
        </Text>
      </View>

      <View style={styles.statusBar}>
        <Text>Form dirty: {isDirty ? 'Yes' : 'No'}</Text>
        <Text>Form valid: {isValid ? 'Yes' : 'No'}</Text>
        <Text>
          Dirty fields: {Object.keys(dirtyFields).join(', ') || 'None'}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Prefill"
          onPress={handlePrefill}
        />
        <Button
          title="Reset"
          onPress={() => reset()}
          disabled={!isDirty}
        />
        <Button
          title={isSubmitting ? 'Saving...' : 'Save'}
          onPress={handleSubmit(onSubmit)}
          disabled={!isDirty || !isValid || isSubmitting}
        />
      </View>

      {isSubmitting && (
        <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  charCount: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  overLimit: {
    color: '#e74c3c',
  },
  statusBar: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  loader: {
    marginTop: 20,
  },
});
```

## Handling Nested Object Forms

For complex forms with nested structures:

```typescript
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(1, 'Country is required'),
});

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  startDate: z.date(),
  endDate: z.date().nullable(),
  current: z.boolean(),
  address: addressSchema,
});

const profileSchema = z.object({
  personal: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
  }),
  homeAddress: addressSchema,
  workAddress: addressSchema.optional(),
  employment: companySchema.optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function NestedProfileForm() {
  const { control, handleSubmit } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personal: {
        firstName: '',
        lastName: '',
        email: '',
      },
      homeAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <FormInput
        control={control}
        name="personal.firstName"
        label="First Name"
      />
      <FormInput
        control={control}
        name="personal.lastName"
        label="Last Name"
      />
      <FormInput
        control={control}
        name="personal.email"
        label="Email"
        keyboardType="email-address"
      />

      <Text style={styles.sectionTitle}>Home Address</Text>
      <FormInput
        control={control}
        name="homeAddress.street"
        label="Street"
      />
      <FormInput
        control={control}
        name="homeAddress.city"
        label="City"
      />
      <FormInput
        control={control}
        name="homeAddress.state"
        label="State"
      />
      <FormInput
        control={control}
        name="homeAddress.zipCode"
        label="ZIP Code"
        keyboardType="numeric"
      />
      <FormInput
        control={control}
        name="homeAddress.country"
        label="Country"
      />

      <Button
        title="Save Profile"
        onPress={handleSubmit((data) => console.log(data))}
      />
    </ScrollView>
  );
}
```

## Array Field Handling

Handle dynamic arrays of form fields with `useFieldArray`:

```typescript
import React from 'react';
import { View, Text, Button, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const experienceSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  startYear: z.string().regex(/^\d{4}$/, 'Enter a valid year'),
  endYear: z.string().regex(/^\d{4}$/, 'Enter a valid year').or(z.literal('Present')),
  description: z.string().optional(),
});

const resumeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  experiences: z.array(experienceSchema).min(1, 'Add at least one experience'),
  skills: z.array(z.string().min(1, 'Skill cannot be empty')).min(1, 'Add at least one skill'),
});

type ResumeFormData = z.infer<typeof resumeSchema>;

export function ResumeBuilder() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      name: '',
      email: '',
      experiences: [
        { company: '', position: '', startYear: '', endYear: '', description: '' },
      ],
      skills: [''],
    },
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
    move: moveExperience,
  } = useFieldArray({
    control,
    name: 'experiences',
  });

  const {
    fields: skillFields,
    append: appendSkill,
    remove: removeSkill,
  } = useFieldArray({
    control,
    name: 'skills' as never, // Type assertion needed for string arrays
  });

  const onSubmit = (data: ResumeFormData) => {
    console.log('Resume data:', JSON.stringify(data, null, 2));
  };

  return (
    <ScrollView style={styles.container}>
      <FormInput control={control} name="name" label="Full Name" />
      <FormInput control={control} name="email" label="Email" keyboardType="email-address" />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Work Experience</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              appendExperience({
                company: '',
                position: '',
                startYear: '',
                endYear: '',
                description: '',
              })
            }
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {experienceFields.map((field, index) => (
          <View key={field.id} style={styles.arrayItem}>
            <View style={styles.arrayItemHeader}>
              <Text style={styles.arrayItemTitle}>Experience {index + 1}</Text>
              <View style={styles.arrayItemActions}>
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => moveExperience(index, index - 1)}
                    style={styles.actionButton}
                  >
                    <Text>Up</Text>
                  </TouchableOpacity>
                )}
                {index < experienceFields.length - 1 && (
                  <TouchableOpacity
                    onPress={() => moveExperience(index, index + 1)}
                    style={styles.actionButton}
                  >
                    <Text>Down</Text>
                  </TouchableOpacity>
                )}
                {experienceFields.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeExperience(index)}
                    style={[styles.actionButton, styles.removeButton]}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <FormInput
              control={control}
              name={`experiences.${index}.company`}
              label="Company"
            />
            <FormInput
              control={control}
              name={`experiences.${index}.position`}
              label="Position"
            />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <FormInput
                  control={control}
                  name={`experiences.${index}.startYear`}
                  label="Start Year"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <FormInput
                  control={control}
                  name={`experiences.${index}.endYear`}
                  label="End Year"
                />
              </View>
            </View>
            <FormInput
              control={control}
              name={`experiences.${index}.description`}
              label="Description"
              multiline
              numberOfLines={3}
            />
          </View>
        ))}

        {errors.experiences?.root && (
          <Text style={styles.errorText}>{errors.experiences.root.message}</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => appendSkill('')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {skillFields.map((field, index) => (
          <View key={field.id} style={styles.skillRow}>
            <View style={styles.skillInput}>
              <Controller
                control={control}
                name={`skills.${index}`}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View>
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      value={value}
                      onChangeText={onChange}
                      placeholder={`Skill ${index + 1}`}
                    />
                    {error && <Text style={styles.errorText}>{error.message}</Text>}
                  </View>
                )}
              />
            </View>
            {skillFields.length > 1 && (
              <TouchableOpacity
                onPress={() => removeSkill(index)}
                style={styles.removeSkillButton}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <Button title="Submit Resume" onPress={handleSubmit(onSubmit)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  arrayItem: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  arrayItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrayItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  arrayItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  removeButton: {
    backgroundColor: '#ffebee',
  },
  removeButtonText: {
    color: '#c62828',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  skillInput: {
    flex: 1,
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  removeSkillButton: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
});
```

## Performance Optimization

React Hook Form is already optimized, but here are additional strategies:

```typescript
import React, { memo, useCallback } from 'react';
import { useForm, useWatch, Control } from 'react-hook-form';

// Isolate re-renders with useWatch in child components
type WatchedFieldProps = {
  control: Control<FormData>;
};

const CharacterCounter = memo(function CharacterCounter({
  control,
}: WatchedFieldProps) {
  // Only this component re-renders when 'bio' changes
  const bio = useWatch({ control, name: 'bio' });
  return <Text>{bio?.length || 0}/160</Text>;
});

const PasswordStrength = memo(function PasswordStrength({
  control,
}: WatchedFieldProps) {
  const password = useWatch({ control, name: 'password' });

  const strength = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  return (
    <View style={styles.strengthBar}>
      {[1, 2, 3, 4, 5].map((level) => (
        <View
          key={level}
          style={[
            styles.strengthSegment,
            level <= strength && styles.strengthFilled,
          ]}
        />
      ))}
    </View>
  );
});

// Debounced validation for expensive checks
function useDebouncedValidation<T>(
  validateFn: (value: T) => Promise<boolean>,
  delay: number = 500
) {
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return useCallback(
    async (value: T): Promise<boolean | string> => {
      return new Promise((resolve) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
          const isValid = await validateFn(value);
          resolve(isValid || 'Validation failed');
        }, delay);
      });
    },
    [validateFn, delay]
  );
}

// Example: Check username availability
export function OptimizedForm() {
  const checkUsernameAvailability = useCallback(async (username: string) => {
    const response = await fetch(`/api/check-username?username=${username}`);
    const { available } = await response.json();
    return available;
  }, []);

  const debouncedUsernameCheck = useDebouncedValidation(
    checkUsernameAvailability,
    500
  );

  const { control, handleSubmit } = useForm({
    defaultValues: { username: '', bio: '', password: '' },
    mode: 'onChange',
  });

  return (
    <View>
      <Controller
        control={control}
        name="username"
        rules={{
          required: 'Username is required',
          validate: debouncedUsernameCheck,
        }}
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
            {fieldState.error && <Text>{fieldState.error.message}</Text>}
          </View>
        )}
      />

      <CharacterCounter control={control} />
      <PasswordStrength control={control} />
    </View>
  );
}

// Use shouldUnregister for conditional fields
export function ConditionalFieldsForm() {
  const { control, watch } = useForm({
    defaultValues: {
      hasCompany: false,
      companyName: '',
      companySize: '',
    },
  });

  const hasCompany = watch('hasCompany');

  return (
    <View>
      <FormCheckbox control={control} name="hasCompany" label="I have a company" />

      {hasCompany && (
        <>
          {/* These fields unregister when hidden, clearing validation */}
          <Controller
            control={control}
            name="companyName"
            shouldUnregister={true}
            rules={{ required: 'Company name is required' }}
            render={({ field }) => <TextInput {...field} />}
          />
          <Controller
            control={control}
            name="companySize"
            shouldUnregister={true}
            rules={{ required: 'Company size is required' }}
            render={({ field }) => <TextInput {...field} />}
          />
        </>
      )}
    </View>
  );
}
```

## Testing Form Components

Comprehensive testing strategies for form components:

```typescript
// __tests__/LoginForm.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders all form fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeTruthy();
    });
  });

  it('shows error for short password', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    fireEvent.changeText(passwordInput, 'short');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('submits form with valid data', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'validpassword123');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validpassword123',
      });
    });
  });

  it('disables submit button while submitting', async () => {
    const slowSubmit = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<LoginForm onSubmit={slowSubmit} />);

    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'validpassword123');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Logging in...')).toBeTruthy();
    });
  });
});

// __tests__/FormInput.test.tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { FormInput } from '../FormInput';

function TestWrapper({ rules }: { rules?: object }) {
  const { control } = useForm({
    defaultValues: { testField: '' },
  });

  return (
    <FormInput
      control={control}
      name="testField"
      label="Test Field"
      placeholder="Enter value"
      rules={rules}
    />
  );
}

describe('FormInput', () => {
  it('renders label and input', () => {
    render(<TestWrapper />);

    expect(screen.getByText('Test Field')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter value')).toBeTruthy();
  });

  it('updates value on text change', () => {
    render(<TestWrapper />);

    const input = screen.getByPlaceholderText('Enter value');
    fireEvent.changeText(input, 'test value');

    expect(input.props.value).toBe('test value');
  });

  it('applies error styling when validation fails', async () => {
    render(<TestWrapper rules={{ required: 'This field is required' }} />);

    const input = screen.getByPlaceholderText('Enter value');
    fireEvent(input, 'blur');

    // Check error styling is applied
  });
});

// __tests__/useFieldArray.test.tsx
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ResumeBuilder } from '../ResumeBuilder';

describe('ResumeBuilder with useFieldArray', () => {
  it('starts with one experience entry', () => {
    render(<ResumeBuilder />);

    expect(screen.getByText('Experience 1')).toBeTruthy();
    expect(screen.queryByText('Experience 2')).toBeNull();
  });

  it('adds new experience when clicking add button', async () => {
    render(<ResumeBuilder />);

    const addButton = screen.getAllByText('+ Add')[0];
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(screen.getByText('Experience 2')).toBeTruthy();
    });
  });

  it('removes experience entry', async () => {
    render(<ResumeBuilder />);

    // Add second experience
    fireEvent.press(screen.getAllByText('+ Add')[0]);

    await waitFor(() => {
      expect(screen.getByText('Experience 2')).toBeTruthy();
    });

    // Remove first experience
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.press(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Experience 2')).toBeNull();
      expect(screen.getByText('Experience 1')).toBeTruthy();
    });
  });

  it('validates minimum experiences', async () => {
    render(<ResumeBuilder />);

    // Try to submit without filling required fields
    fireEvent.press(screen.getByText('Submit Resume'));

    await waitFor(() => {
      expect(screen.getByText('Company name is required')).toBeTruthy();
    });
  });
});
```

## Complete Example: Multi-Step Registration Form

Putting it all together with a production-ready multi-step form:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Button,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Step schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
});

const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(1, 'Country is required'),
});

const accountSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain number'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Combined schema
const registrationSchema = z.object({
  personal: personalInfoSchema,
  address: addressSchema,
  account: accountSchema,
});

type RegistrationData = z.infer<typeof registrationSchema>;

// Step components
function PersonalInfoStep() {
  const { control } = useFormContext<RegistrationData>();

  return (
    <View>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <FormInput control={control} name="personal.firstName" label="First Name" />
      <FormInput control={control} name="personal.lastName" label="Last Name" />
      <FormInput
        control={control}
        name="personal.email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormInput
        control={control}
        name="personal.phone"
        label="Phone Number"
        keyboardType="phone-pad"
      />
    </View>
  );
}

function AddressStep() {
  const { control } = useFormContext<RegistrationData>();

  return (
    <View>
      <Text style={styles.stepTitle}>Address</Text>
      <FormInput control={control} name="address.street" label="Street Address" />
      <FormInput control={control} name="address.city" label="City" />
      <FormInput control={control} name="address.state" label="State" />
      <FormInput
        control={control}
        name="address.zipCode"
        label="ZIP Code"
        keyboardType="numeric"
      />
      <FormInput control={control} name="address.country" label="Country" />
    </View>
  );
}

function AccountStep() {
  const { control } = useFormContext<RegistrationData>();

  return (
    <View>
      <Text style={styles.stepTitle}>Account Details</Text>
      <FormInput
        control={control}
        name="account.username"
        label="Username"
        autoCapitalize="none"
      />
      <FormInput
        control={control}
        name="account.password"
        label="Password"
        secureTextEntry
      />
      <FormInput
        control={control}
        name="account.confirmPassword"
        label="Confirm Password"
        secureTextEntry
      />
      <FormCheckbox
        control={control}
        name="account.acceptTerms"
        label="I accept the terms and conditions"
      />
    </View>
  );
}

// Main form component
export function MultiStepRegistration() {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      personal: { firstName: '', lastName: '', email: '', phone: '' },
      address: { street: '', city: '', state: '', zipCode: '', country: '' },
      account: {
        username: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false as unknown as true,
      },
    },
    mode: 'onBlur',
  });

  const { trigger, handleSubmit, formState } = methods;

  const steps = [
    { component: PersonalInfoStep, fields: ['personal'] as const },
    { component: AddressStep, fields: ['address'] as const },
    { component: AccountStep, fields: ['account'] as const },
  ];

  const StepComponent = steps[currentStep].component;

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = steps[currentStep].fields;
    const result = await trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: RegistrationData) => {
    try {
      console.log('Registration data:', JSON.stringify(data, null, 2));
      // Submit to API
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FormProvider {...methods}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.stepIndicator}>
            Step {currentStep + 1} of {steps.length}
          </Text>

          {/* Current step form */}
          <StepComponent />

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <Button title="Previous" onPress={handlePrevious} />
            )}

            {currentStep < steps.length - 1 ? (
              <Button title="Next" onPress={handleNext} />
            ) : (
              <Button
                title={formState.isSubmitting ? 'Submitting...' : 'Register'}
                onPress={handleSubmit(onSubmit)}
                disabled={formState.isSubmitting}
              />
            )}
          </View>
        </ScrollView>
      </FormProvider>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  stepIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
```

## Summary

| Concept | Implementation |
|---------|----------------|
| **Basic Setup** | `useForm` with TypeScript generics |
| **Validation** | Zod schemas with `zodResolver` |
| **Reusable Components** | Generic `FormInput`, `FormSelect`, `FormCheckbox` |
| **Error Handling** | `fieldState.error` and animated error displays |
| **Nested Objects** | Dot notation paths like `address.city` |
| **Array Fields** | `useFieldArray` for dynamic lists |
| **Performance** | `useWatch` isolation, `shouldUnregister`, memoization |
| **Testing** | React Testing Library with async validation |
| **Multi-Step Forms** | `FormProvider` context with step validation |

React Hook Form provides an excellent foundation for building type-safe, performant forms in React Native. Combined with Zod for schema validation, you get compile-time type checking and runtime validation that keeps your forms reliable and your code maintainable. The patterns shown here scale from simple login forms to complex multi-step registration flows with nested objects and dynamic arrays.
