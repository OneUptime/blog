# How to Structure Large-Scale React Native Applications for Maintainability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Architecture, Project Structure, Mobile Development, Best Practices, TypeScript

Description: Learn best practices for structuring large-scale React Native applications with scalable architecture patterns for long-term maintainability.

---

Building a React Native application that starts small and grows to serve millions of users requires architectural foresight. The decisions you make about project structure in the early stages determine how easily your team can add features, fix bugs, and onboard new developers months or years down the road.

This guide covers battle-tested patterns for organizing large-scale React Native codebases. Whether you're starting fresh or refactoring an existing application, these principles will help you create a maintainable, scalable architecture.

## Feature-Based vs Layer-Based Architecture

The first major architectural decision is how to organize your code at the highest level. Two dominant patterns exist: layer-based and feature-based organization.

### Layer-Based Architecture

Layer-based architecture groups code by technical responsibility:

```
src/
  components/
    Button.tsx
    Card.tsx
    Header.tsx
    UserAvatar.tsx
    ProductCard.tsx
  screens/
    HomeScreen.tsx
    ProfileScreen.tsx
    ProductScreen.tsx
    CartScreen.tsx
  services/
    api.ts
    auth.ts
    storage.ts
  hooks/
    useAuth.ts
    useProducts.ts
    useCart.ts
  utils/
    formatters.ts
    validators.ts
```

This structure is intuitive for small applications. Finding a component or service is straightforward when you know its type. However, as applications grow, this approach creates problems:

- **Feature fragmentation**: Code for a single feature (like "Cart") spreads across multiple directories
- **Difficult feature isolation**: Removing or modifying a feature requires changes across the entire codebase
- **Team coordination overhead**: Multiple developers working on different features constantly modify the same directories
- **Unclear dependencies**: It's hard to understand which components depend on which services

### Feature-Based Architecture (Recommended)

Feature-based architecture groups code by business domain:

```
src/
  features/
    auth/
      components/
        LoginForm.tsx
        SignupForm.tsx
        PasswordReset.tsx
      screens/
        LoginScreen.tsx
        SignupScreen.tsx
      services/
        authService.ts
      hooks/
        useAuth.ts
        useSession.ts
      types/
        auth.types.ts
      index.ts
    products/
      components/
        ProductCard.tsx
        ProductList.tsx
        ProductFilters.tsx
      screens/
        ProductListScreen.tsx
        ProductDetailScreen.tsx
      services/
        productService.ts
      hooks/
        useProducts.ts
        useProductSearch.ts
      types/
        product.types.ts
      index.ts
    cart/
      components/
        CartItem.tsx
        CartSummary.tsx
      screens/
        CartScreen.tsx
        CheckoutScreen.tsx
      services/
        cartService.ts
      hooks/
        useCart.ts
      types/
        cart.types.ts
      index.ts
  shared/
    components/
    hooks/
    utils/
    types/
```

Benefits of feature-based architecture:

- **Feature cohesion**: All code related to a feature lives together
- **Team scalability**: Teams can own entire features without stepping on each other
- **Clear boundaries**: Dependencies between features are explicit
- **Easier refactoring**: Modifying or removing a feature is contained
- **Better code splitting**: Features can be lazy-loaded independently

### The Hybrid Approach

Most large applications benefit from a hybrid approach that combines feature modules with a shared layer:

```
src/
  app/                    # Application shell
    App.tsx
    navigation/
    providers/
  features/               # Feature modules
    auth/
    products/
    cart/
    profile/
    notifications/
  shared/                 # Cross-cutting concerns
    components/           # Reusable UI components
    hooks/               # Generic hooks
    services/            # Core services (analytics, storage)
    utils/               # Pure utility functions
    types/               # Shared type definitions
    constants/           # App-wide constants
```

## Directory Structure Patterns

A well-organized directory structure communicates intent. Here's a comprehensive structure for large React Native applications:

```
src/
  app/
    App.tsx                       # Root component
    navigation/
      RootNavigator.tsx           # Main navigation container
      AuthNavigator.tsx           # Authentication flow
      MainNavigator.tsx           # Authenticated app flow
      linking.ts                  # Deep linking configuration
      types.ts                    # Navigation type definitions
    providers/
      AppProviders.tsx            # Composed provider wrapper
      ThemeProvider.tsx
      AuthProvider.tsx
      QueryProvider.tsx

  features/
    auth/
      components/
        LoginForm/
          LoginForm.tsx
          LoginForm.styles.ts
          LoginForm.test.tsx
          index.ts
        SignupForm/
          SignupForm.tsx
          SignupForm.styles.ts
          SignupForm.test.tsx
          index.ts
      screens/
        LoginScreen/
          LoginScreen.tsx
          LoginScreen.test.tsx
          index.ts
      services/
        authService.ts
        authService.test.ts
        tokenStorage.ts
      hooks/
        useAuth.ts
        useAuth.test.ts
        useSession.ts
      store/                      # Feature-specific state
        authSlice.ts
        authSelectors.ts
      types/
        auth.types.ts
      constants/
        authConstants.ts
      utils/
        validateCredentials.ts
      index.ts                    # Public API exports

  shared/
    components/
      Button/
        Button.tsx
        Button.styles.ts
        Button.test.tsx
        variants.ts
        index.ts
      Input/
      Modal/
      Card/
      Avatar/
      Typography/
    hooks/
      useDebounce.ts
      useKeyboard.ts
      usePrevious.ts
      useAppState.ts
    services/
      api/
        apiClient.ts
        interceptors.ts
        errorHandler.ts
      analytics/
        analyticsService.ts
        events.ts
      storage/
        secureStorage.ts
        asyncStorage.ts
    utils/
      formatters/
        dateFormatters.ts
        currencyFormatters.ts
        stringFormatters.ts
      validators/
        emailValidator.ts
        phoneValidator.ts
      platform/
        permissions.ts
        deviceInfo.ts
    types/
      api.types.ts
      common.types.ts
    constants/
      theme.ts
      config.ts

  config/
    env.ts                        # Environment variables
    settings.ts                   # App settings
    featureFlags.ts              # Feature flag definitions

  assets/
    images/
    fonts/
    animations/
```

## Separating Concerns Properly

Clean separation of concerns makes code easier to understand, test, and modify. Each layer should have a single responsibility.

### The Dependency Rule

Dependencies should point inward. Outer layers depend on inner layers, never the reverse:

```
┌─────────────────────────────────────────────┐
│                   UI Layer                   │
│  (Screens, Components, Navigation)           │
├─────────────────────────────────────────────┤
│               Application Layer              │
│  (Hooks, State Management, ViewModels)       │
├─────────────────────────────────────────────┤
│                Domain Layer                  │
│  (Business Logic, Entities, Use Cases)       │
├─────────────────────────────────────────────┤
│             Infrastructure Layer             │
│  (API, Storage, Device APIs, Analytics)      │
└─────────────────────────────────────────────┘
```

### Example: Clean Feature Architecture

```typescript
// features/orders/types/order.types.ts
// Domain types - no dependencies
export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

// features/orders/services/orderService.ts
// Infrastructure - depends on types only
import { apiClient } from '@/shared/services/api';
import type { Order } from '../types/order.types';

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const response = await apiClient.get<Order[]>('/orders');
    return response.data;
  },

  async getOrder(id: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  async createOrder(items: OrderItem[]): Promise<Order> {
    const response = await apiClient.post<Order>('/orders', { items });
    return response.data;
  },
};

// features/orders/hooks/useOrders.ts
// Application layer - orchestrates service calls
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import type { Order, OrderItem } from '../types/order.types';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: OrderItem[]) => orderService.createOrder(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// features/orders/screens/OrderListScreen/OrderListScreen.tsx
// UI layer - consumes hooks, renders UI
import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useOrders } from '../../hooks/useOrders';
import { OrderCard } from '../../components/OrderCard';
import { LoadingState, ErrorState, EmptyState } from '@/shared/components';

export function OrderListScreen() {
  const { data: orders, isLoading, error, refetch, isRefetching } = useOrders();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!orders?.length) return <EmptyState message="No orders yet" />;

  return (
    <FlatList
      data={orders}
      renderItem={({ item }) => <OrderCard order={item} />}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    />
  );
}
```

## Component Organization

Well-organized components are the foundation of maintainable React Native applications. Follow these patterns for component structure:

### Component Folder Structure

Each component should be self-contained in its own folder:

```
Button/
  Button.tsx           # Component implementation
  Button.styles.ts     # Styles (StyleSheet or styled-components)
  Button.test.tsx      # Unit tests
  Button.stories.tsx   # Storybook stories (optional)
  types.ts             # Component-specific types
  variants.ts          # Variant configurations
  index.ts             # Public exports
```

### Component Implementation Pattern

```typescript
// shared/components/Button/types.ts
import { PressableProps, StyleProp, ViewStyle, TextStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// shared/components/Button/Button.styles.ts
import { StyleSheet } from 'react-native';
import { theme } from '@/shared/constants/theme';
import type { ButtonVariant, ButtonSize } from './types';

export const createStyles = (variant: ButtonVariant, size: ButtonSize) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      ...getVariantStyles(variant),
      ...getSizeStyles(size),
    },
    text: {
      fontWeight: '600',
      ...getTextVariantStyles(variant),
      ...getTextSizeStyles(size),
    },
    icon: {
      marginHorizontal: theme.spacing.xs,
    },
    loading: {
      opacity: 0.7,
    },
  });

const getVariantStyles = (variant: ButtonVariant) => {
  const variants = {
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.secondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };
  return variants[variant];
};

const getSizeStyles = (size: ButtonSize) => {
  const sizes = {
    sm: { paddingVertical: 8, paddingHorizontal: 16 },
    md: { paddingVertical: 12, paddingHorizontal: 24 },
    lg: { paddingVertical: 16, paddingHorizontal: 32 },
  };
  return sizes[size];
};

// shared/components/Button/Button.tsx
import React, { useMemo } from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { createStyles } from './Button.styles';
import type { ButtonProps } from './types';

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  textStyle,
  ...pressableProps
}: ButtonProps) {
  const styles = useMemo(() => createStyles(variant, size), [variant, size]);

  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        fullWidth && { width: '100%' },
        pressed && { opacity: 0.8 },
        isDisabled && styles.loading,
        style,
      ]}
      disabled={isDisabled}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={styles.text.color} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.icon}>{icon}</View>
          )}
          <Text style={[styles.text, textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.icon}>{icon}</View>
          )}
        </>
      )}
    </Pressable>
  );
}

// shared/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './types';
```

### Compound Components Pattern

For complex components with multiple sub-components, use the compound component pattern:

```typescript
// shared/components/Card/Card.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

interface CardContextValue {
  variant: 'elevated' | 'outlined' | 'filled';
}

const CardContext = createContext<CardContextValue>({ variant: 'elevated' });

interface CardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
}

function Card({ children, variant = 'elevated', onPress }: CardProps) {
  const content = (
    <CardContext.Provider value={{ variant }}>
      <View style={[styles.card, variantStyles[variant]]}>
        {children}
      </View>
    </CardContext.Provider>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

function CardHeader({ children }: { children: ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

function CardTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

function CardContent({ children }: { children: ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

function CardFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

function CardImage({ source, height = 200 }: { source: any; height?: number }) {
  return <Image source={source} style={[styles.image, { height }]} />;
}

// Attach sub-components
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;
Card.Image = CardImage;

export { Card };

// Usage
<Card variant="elevated" onPress={() => navigate('Details', { id })}>
  <Card.Image source={{ uri: imageUrl }} />
  <Card.Header>
    <Card.Title>Product Name</Card.Title>
  </Card.Header>
  <Card.Content>
    <Text>Product description goes here...</Text>
  </Card.Content>
  <Card.Footer>
    <Button title="Add to Cart" onPress={addToCart} />
  </Card.Footer>
</Card>
```

## Screen vs Component Separation

Understanding the distinction between screens and components is crucial for proper organization.

### Screens

Screens are top-level components that:
- Are navigation destinations
- Compose multiple components
- Handle data fetching and state
- Manage screen-level side effects

```typescript
// features/products/screens/ProductDetailScreen/ProductDetailScreen.tsx
import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useProduct } from '../../hooks/useProduct';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import {
  ProductHeader,
  ProductGallery,
  ProductInfo,
  ProductOptions,
  ProductReviews,
} from '../../components';
import { Button, LoadingState, ErrorState } from '@/shared/components';
import { styles } from './ProductDetailScreen.styles';
import type { ProductDetailScreenProps } from '@/app/navigation/types';

export function ProductDetailScreen() {
  const route = useRoute<ProductDetailScreenProps['route']>();
  const navigation = useNavigation();
  const analytics = useAnalytics();

  const { productId } = route.params;
  const { data: product, isLoading, error, refetch } = useProduct(productId);
  const { mutate: addToCart, isPending: isAddingToCart } = useAddToCart();

  useEffect(() => {
    if (product) {
      analytics.trackEvent('product_viewed', {
        productId: product.id,
        productName: product.name,
        category: product.category,
      });
    }
  }, [product, analytics]);

  const handleAddToCart = () => {
    if (!product) return;

    addToCart(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          analytics.trackEvent('product_added_to_cart', {
            productId: product.id,
          });
        },
      }
    );
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!product) return null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <ProductGallery images={product.images} />
        <ProductHeader
          name={product.name}
          price={product.price}
          rating={product.rating}
        />
        <ProductInfo description={product.description} specs={product.specs} />
        <ProductOptions
          options={product.options}
          onSelect={(option) => {/* handle selection */}}
        />
        <ProductReviews productId={product.id} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Add to Cart"
          onPress={handleAddToCart}
          loading={isAddingToCart}
          fullWidth
        />
      </View>
    </View>
  );
}
```

### Components

Components are reusable UI building blocks that:
- Receive data via props
- Focus on presentation
- Are stateless or have minimal local state
- Are highly reusable

```typescript
// features/products/components/ProductHeader/ProductHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Rating } from '@/shared/components';
import { formatCurrency } from '@/shared/utils/formatters';
import { styles } from './ProductHeader.styles';

interface ProductHeaderProps {
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount?: number;
}

export function ProductHeader({
  name,
  price,
  originalPrice,
  rating,
  reviewCount,
}: ProductHeaderProps) {
  const hasDiscount = originalPrice && originalPrice > price;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{name}</Text>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatCurrency(price)}</Text>
        {hasDiscount && (
          <Text style={styles.originalPrice}>
            {formatCurrency(originalPrice)}
          </Text>
        )}
      </View>

      <View style={styles.ratingContainer}>
        <Rating value={rating} />
        {reviewCount !== undefined && (
          <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
        )}
      </View>
    </View>
  );
}
```

## Service Layer Patterns

The service layer abstracts external dependencies and provides a clean API for the rest of the application.

### API Service Pattern

```typescript
// shared/services/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getToken, refreshToken } from '@/features/auth/services/tokenStorage';
import { env } from '@/config/env';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: env.API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token) => {
                originalRequest.headers = {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${token}`,
                };
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await refreshToken();
            this.refreshSubscribers.forEach((callback) => callback(newToken));
            this.refreshSubscribers = [];

            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newToken}`,
            };

            return this.client(originalRequest);
          } catch (refreshError) {
            // Handle refresh failure (logout user)
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private normalizeError(error: AxiosError): Error {
    if (error.response) {
      const data = error.response.data as { message?: string };
      return new Error(data.message || 'An error occurred');
    }
    if (error.request) {
      return new Error('Network error - please check your connection');
    }
    return error;
  }

  async get<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
```

### Feature Service Example

```typescript
// features/products/services/productService.ts
import { apiClient } from '@/shared/services/api';
import type { Product, ProductFilters, PaginatedResponse } from '../types';

export const productService = {
  async getProducts(
    filters?: ProductFilters,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.minPrice && { minPrice: String(filters.minPrice) }),
      ...(filters?.maxPrice && { maxPrice: String(filters.maxPrice) }),
      ...(filters?.sortBy && { sortBy: filters.sortBy }),
    });

    const response = await apiClient.get<PaginatedResponse<Product>>(
      `/products?${params}`
    );
    return response.data;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async searchProducts(query: string): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(
      `/products/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};
```

## State Management Organization

For large applications, organize state management by feature with a clear distinction between server state and client state.

### Server State with React Query

```typescript
// features/products/hooks/useProducts.ts
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/productService';
import type { ProductFilters } from '../types';

// Query key factory
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
};

export function useProducts(filters?: ProductFilters) {
  return useInfiniteQuery({
    queryKey: productKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => productService.getProducts(filters, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: () => productService.searchProducts(query),
    enabled: query.length >= 2,
  });
}
```

### Client State with Zustand

```typescript
// features/cart/store/cartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.productId === item.productId
          );

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }

          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## Navigation Structure

Organize navigation by authentication state and feature areas.

```typescript
// app/navigation/types.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

// Auth navigator
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

// Main tab navigator
export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
};

// Home stack
export type HomeStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  Category: { categoryId: string; categoryName: string };
};

// Profile stack
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Settings: undefined;
};

// Screen props types
export type ProductDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>,
  BottomTabScreenProps<MainTabParamList>
>;

// app/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingScreen } from '@/features/onboarding/screens';
import { linking } from './linking';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, hasCompletedOnboarding } = useAuth();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// app/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeNavigator } from './stacks/HomeNavigator';
import { SearchNavigator } from './stacks/SearchNavigator';
import { CartNavigator } from './stacks/CartNavigator';
import { ProfileNavigator } from './stacks/ProfileNavigator';
import { TabBar } from '@/shared/components/TabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} />
      <Tab.Screen name="SearchTab" component={SearchNavigator} />
      <Tab.Screen name="CartTab" component={CartNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
```

## Shared Utilities and Hooks

Create a well-organized shared layer for cross-cutting concerns.

### Custom Hooks

```typescript
// shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// shared/hooks/useAppState.ts
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState() {
  const [appState, setAppState] = useState(AppState.currentState);
  const previousState = useRef(appState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      previousState.current = appState;
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  return {
    appState,
    previousState: previousState.current,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    justBecameActive:
      previousState.current !== 'active' && appState === 'active',
  };
}

// shared/hooks/useKeyboard.ts
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      (event: KeyboardEvent) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible, dismiss: Keyboard.dismiss };
}
```

### Utility Functions

```typescript
// shared/utils/formatters/dateFormatters.ts
import { format, formatDistance, formatRelative, isToday, isYesterday } from 'date-fns';

export function formatDate(date: Date | string, pattern = 'MMM d, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatRelativeTime(date: Date | string): string {
  const dateObj = new Date(date);

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'h:mm a')}`;
  }

  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

// shared/utils/formatters/currencyFormatters.ts
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

// shared/utils/validators/validators.ts
export const validators = {
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value: string): boolean => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(value);
  },

  password: (value: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (value.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('Password must contain a number');
    }

    return { valid: errors.length === 0, errors };
  },
};
```

## Configuration Management

Centralize configuration for different environments and feature flags.

```typescript
// config/env.ts
import Config from 'react-native-config';

interface Environment {
  API_BASE_URL: string;
  WS_URL: string;
  SENTRY_DSN: string;
  ANALYTICS_KEY: string;
  ENV_NAME: 'development' | 'staging' | 'production';
  DEBUG_MODE: boolean;
}

export const env: Environment = {
  API_BASE_URL: Config.API_BASE_URL || 'http://localhost:3000',
  WS_URL: Config.WS_URL || 'ws://localhost:3000',
  SENTRY_DSN: Config.SENTRY_DSN || '',
  ANALYTICS_KEY: Config.ANALYTICS_KEY || '',
  ENV_NAME: (Config.ENV_NAME as Environment['ENV_NAME']) || 'development',
  DEBUG_MODE: Config.DEBUG_MODE === 'true',
};

// config/settings.ts
export const settings = {
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    imageCacheMaxSize: 100,
  },
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  validation: {
    maxUsernameLength: 30,
    minPasswordLength: 8,
    maxBioLength: 500,
  },
};

// config/featureFlags.ts
import { env } from './env';

interface FeatureFlags {
  enableNewCheckout: boolean;
  enableSocialLogin: boolean;
  enablePushNotifications: boolean;
  enableDarkMode: boolean;
  enableBiometricAuth: boolean;
}

const developmentFlags: FeatureFlags = {
  enableNewCheckout: true,
  enableSocialLogin: true,
  enablePushNotifications: true,
  enableDarkMode: true,
  enableBiometricAuth: true,
};

const stagingFlags: FeatureFlags = {
  enableNewCheckout: true,
  enableSocialLogin: true,
  enablePushNotifications: true,
  enableDarkMode: true,
  enableBiometricAuth: false,
};

const productionFlags: FeatureFlags = {
  enableNewCheckout: false,
  enableSocialLogin: true,
  enablePushNotifications: true,
  enableDarkMode: true,
  enableBiometricAuth: false,
};

const flagsByEnv = {
  development: developmentFlags,
  staging: stagingFlags,
  production: productionFlags,
};

export const featureFlags: FeatureFlags = flagsByEnv[env.ENV_NAME];
```

## Environment-Specific Code

Handle platform and environment differences cleanly.

```typescript
// shared/utils/platform/platform.ts
import { Platform, Dimensions } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

const { width, height } = Dimensions.get('window');
export const screenWidth = width;
export const screenHeight = height;

export const isSmallDevice = width < 375;
export const isMediumDevice = width >= 375 && width < 414;
export const isLargeDevice = width >= 414;

export const isTablet = Math.min(width, height) >= 600;

// Platform-specific values
export const platformSelect = <T>(config: { ios: T; android: T; default?: T }): T => {
  return Platform.select(config) ?? config.default ?? config.ios;
};

// shared/utils/platform/permissions.ts
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.CAMERA);
    return result === RESULTS.GRANTED;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestLocationPermission(): Promise<boolean> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  });

  if (!permission) return false;

  const result = await request(permission);
  return result === RESULTS.GRANTED;
}
```

## Testing Structure Alignment

Mirror your source structure in tests for easy navigation.

```
__tests__/
  features/
    auth/
      components/
        LoginForm.test.tsx
      screens/
        LoginScreen.test.tsx
      hooks/
        useAuth.test.ts
      services/
        authService.test.ts
    products/
      components/
        ProductCard.test.tsx
      hooks/
        useProducts.test.ts
  shared/
    components/
      Button.test.tsx
    hooks/
      useDebounce.test.ts
    utils/
      formatters.test.ts
  e2e/
    auth.e2e.ts
    checkout.e2e.ts
  setup/
    jest.setup.ts
    testUtils.tsx
```

### Test Utilities

```typescript
// __tests__/setup/testUtils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
```

### Example Test

```typescript
// __tests__/features/products/hooks/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '@/features/products/hooks/useProducts';
import { productService } from '@/features/products/services/productService';

jest.mock('@/features/products/services/productService');

const mockProductService = productService as jest.Mocked<typeof productService>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches products successfully', async () => {
    const mockProducts = {
      data: [{ id: '1', name: 'Product 1' }],
      page: 1,
      hasMore: false,
    };

    mockProductService.getProducts.mockResolvedValue(mockProducts);

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toEqual(mockProducts);
    expect(mockProductService.getProducts).toHaveBeenCalledWith(undefined, 1);
  });

  it('handles errors correctly', async () => {
    const error = new Error('Network error');
    mockProductService.getProducts.mockRejectedValue(error);

    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
```

## Summary

Building maintainable large-scale React Native applications requires intentional architecture decisions from the start. Here are the key principles:

| Principle | Implementation |
|-----------|----------------|
| **Feature-based organization** | Group code by business domain, not technical layer |
| **Clear boundaries** | Define explicit public APIs for each feature |
| **Separation of concerns** | Keep UI, business logic, and data layers distinct |
| **Consistent patterns** | Use the same structure across all features |
| **Type safety** | Leverage TypeScript throughout the codebase |
| **Test alignment** | Mirror source structure in test directories |
| **Configuration isolation** | Centralize environment and feature configuration |

The time invested in proper architecture pays dividends as your application grows. Teams can work independently on features, new developers can understand the codebase quickly, and refactoring becomes manageable rather than risky.

Start with these patterns from day one, and your React Native application will remain maintainable regardless of scale.

---

**Related Reading:**

- [Why PWAs are the Future](https://oneuptime.com/blog/post/2025-08-19-native-apps-had-a-good-run-but-pwa-has-caught-up-and-is-the-future/view)
- [The Power of Three: How Small Teams Drive Big Results](https://oneuptime.com/blog/post/2025-03-13-power-of-three-how-small-teams-drive-big-results/view)
- [The Hidden Costs of Dependency Bloat](https://oneuptime.com/blog/post/2025-09-02-the-hidden-costs-of-dependency-bloat-in-software-development/view)
