# How to Implement Custom Analytics Events in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Analytics, Events, Mobile Development, Tracking, User Behavior

Description: Learn how to implement custom analytics events in React Native to track user behavior and app usage patterns.

---

## Introduction

Analytics is the backbone of data-driven mobile app development. Understanding how users interact with your React Native application provides invaluable insights for improving user experience, optimizing conversion funnels, and making informed product decisions. This comprehensive guide walks you through implementing custom analytics events in React Native, from planning your analytics strategy to debugging and privacy considerations.

## Analytics Strategy Planning

Before writing any code, you need a solid analytics strategy. A well-planned approach saves time and ensures you collect meaningful data.

### Defining Your Goals

Start by identifying what you want to learn about your users:

```typescript
// Define your analytics goals
const AnalyticsGoals = {
  ENGAGEMENT: 'engagement',      // How users interact with features
  RETENTION: 'retention',        // What keeps users coming back
  CONVERSION: 'conversion',      // What drives purchases/signups
  PERFORMANCE: 'performance',    // App performance metrics
  ERRORS: 'errors',              // Error tracking and debugging
} as const;
```

### Creating an Analytics Plan Document

Document your events before implementation:

```typescript
interface AnalyticsEventDefinition {
  name: string;
  description: string;
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    description: string;
  }>;
  triggers: string[];
  owner: string;
}

const eventDefinitions: AnalyticsEventDefinition[] = [
  {
    name: 'product_viewed',
    description: 'User viewed a product detail page',
    properties: {
      product_id: { type: 'string', required: true, description: 'Unique product identifier' },
      product_name: { type: 'string', required: true, description: 'Product display name' },
      category: { type: 'string', required: true, description: 'Product category' },
      price: { type: 'number', required: true, description: 'Product price in cents' },
      currency: { type: 'string', required: true, description: 'ISO currency code' },
    },
    triggers: ['ProductDetailScreen mount', 'Deep link to product'],
    owner: 'product-team',
  },
];
```

## Event Naming Conventions

Consistent naming conventions make analytics data easier to query and maintain.

### Recommended Naming Patterns

```typescript
// analytics/naming.ts

// Use object_action pattern (noun_verb)
const NamingConventions = {
  // Good: Clear, consistent, lowercase with underscores
  GOOD_EXAMPLES: [
    'button_clicked',
    'screen_viewed',
    'product_added_to_cart',
    'checkout_started',
    'purchase_completed',
    'search_performed',
    'filter_applied',
    'user_signed_up',
    'user_logged_in',
    'notification_received',
    'error_occurred',
  ],

  // Bad: Inconsistent, unclear, mixed formats
  BAD_EXAMPLES: [
    'click',           // Too vague
    'ButtonClick',     // Inconsistent casing
    'user-login',      // Hyphens instead of underscores
    'PURCHASE',        // All caps
    'addToCart',       // CamelCase
  ],
} as const;

// Event name builder for consistency
export function buildEventName(
  object: string,
  action: string,
  modifier?: string
): string {
  const parts = [object, action];
  if (modifier) {
    parts.push(modifier);
  }
  return parts.join('_').toLowerCase().replace(/\s+/g, '_');
}

// Usage
const eventName = buildEventName('product', 'added', 'to_cart');
// Result: 'product_added_to_cart'
```

### Event Categories

Organize events into logical categories:

```typescript
// analytics/events.ts

export const AnalyticsEvents = {
  // Navigation Events
  SCREEN_VIEWED: 'screen_viewed',
  TAB_SELECTED: 'tab_selected',
  BACK_PRESSED: 'back_pressed',
  DEEP_LINK_OPENED: 'deep_link_opened',

  // User Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',

  // Engagement Events
  BUTTON_CLICKED: 'button_clicked',
  LINK_CLICKED: 'link_clicked',
  FORM_SUBMITTED: 'form_submitted',
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  CONTENT_SHARED: 'content_shared',

  // E-commerce Events
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  PRODUCT_REMOVED_FROM_CART: 'product_removed_from_cart',
  CART_VIEWED: 'cart_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_STEP_COMPLETED: 'checkout_step_completed',
  PURCHASE_COMPLETED: 'purchase_completed',

  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  CRASH_DETECTED: 'crash_detected',
  API_ERROR: 'api_error',
} as const;
```

## Event Properties and Context

Rich event properties provide context for meaningful analysis.

### Creating a Base Analytics Service

```typescript
// analytics/AnalyticsService.ts

import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';

interface EventProperties {
  [key: string]: string | number | boolean | object | null | undefined;
}

interface UserContext {
  userId?: string;
  email?: string;
  name?: string;
  plan?: string;
  createdAt?: string;
}

interface DeviceContext {
  platform: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  deviceModel: string;
  deviceId: string;
  screenWidth: number;
  screenHeight: number;
  locale: string;
  timezone: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private userContext: UserContext = {};
  private sessionId: string;
  private sessionStartTime: number;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceContext(): Promise<DeviceContext> {
    const { width, height } = Dimensions.get('window');

    return {
      platform: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      deviceModel: await DeviceInfo.getDeviceId(),
      deviceId: await DeviceInfo.getUniqueId(),
      screenWidth: width,
      screenHeight: height,
      locale: DeviceInfo.getDeviceLocale?.() || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getSessionContext() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      eventTimestamp: new Date().toISOString(),
    };
  }

  setUser(user: UserContext): void {
    this.userContext = user;
  }

  clearUser(): void {
    this.userContext = {};
  }

  async track(eventName: string, properties: EventProperties = {}): Promise<void> {
    const deviceContext = await this.getDeviceContext();
    const sessionContext = this.getSessionContext();

    const enrichedEvent = {
      event: eventName,
      properties: {
        ...properties,
        ...sessionContext,
      },
      context: {
        device: deviceContext,
        user: this.userContext,
      },
    };

    // Send to your analytics provider
    await this.sendToAnalytics(enrichedEvent);
  }

  private async sendToAnalytics(event: object): Promise<void> {
    // Implementation depends on your analytics provider
    console.log('Analytics Event:', JSON.stringify(event, null, 2));
  }
}

export const analytics = AnalyticsService.getInstance();
```

## Screen View Tracking

Tracking screen views provides insight into user navigation patterns.

### Automatic Screen Tracking with React Navigation

```typescript
// navigation/AnalyticsNavigator.tsx

import React, { useRef } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { analytics } from '../analytics/AnalyticsService';
import { AnalyticsEvents } from '../analytics/events';

interface ScreenTrackingProps {
  children: React.ReactNode;
}

function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;

  const route = state.routes[state.index];

  if (route.state) {
    // Dive into nested navigators
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
}

export function AnalyticsNavigationContainer({ children }: ScreenTrackingProps) {
  const routeNameRef = useRef<string | undefined>();
  const navigationRef = useRef<any>(null);

  const onStateChange = (state: NavigationState | undefined) => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = getActiveRouteName(state);

    if (previousRouteName !== currentRouteName && currentRouteName) {
      // Track screen view
      analytics.track(AnalyticsEvents.SCREEN_VIEWED, {
        screen_name: currentRouteName,
        previous_screen: previousRouteName || 'none',
      });
    }

    // Save the current route name for later comparison
    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={onStateChange}
      onReady={() => {
        routeNameRef.current = getActiveRouteName(
          navigationRef.current?.getRootState()
        );
      }}
    >
      {children}
    </NavigationContainer>
  );
}
```

### Manual Screen Tracking Hook

```typescript
// hooks/useScreenTracking.ts

import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { analytics } from '../analytics/AnalyticsService';
import { AnalyticsEvents } from '../analytics/events';

interface ScreenTrackingOptions {
  screenName: string;
  screenClass?: string;
  additionalProperties?: Record<string, any>;
}

export function useScreenTracking(options: ScreenTrackingOptions) {
  const { screenName, screenClass, additionalProperties = {} } = options;

  useFocusEffect(() => {
    const trackScreen = async () => {
      await analytics.track(AnalyticsEvents.SCREEN_VIEWED, {
        screen_name: screenName,
        screen_class: screenClass || screenName,
        ...additionalProperties,
      });
    };

    trackScreen();
  });
}

// Usage in a component
function ProductListScreen() {
  useScreenTracking({
    screenName: 'ProductList',
    screenClass: 'ProductListScreen',
    additionalProperties: {
      category: 'electronics',
    },
  });

  return (
    // Screen content
  );
}
```

## User Action Tracking

Track meaningful user interactions to understand behavior.

### Creating Trackable Components

```typescript
// components/TrackableButton.tsx

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text, StyleSheet } from 'react-native';
import { analytics } from '../analytics/AnalyticsService';
import { AnalyticsEvents } from '../analytics/events';

interface TrackableButtonProps extends TouchableOpacityProps {
  title: string;
  trackingId: string;
  trackingProperties?: Record<string, any>;
}

export function TrackableButton({
  title,
  trackingId,
  trackingProperties = {},
  onPress,
  ...props
}: TrackableButtonProps) {
  const handlePress = async (event: any) => {
    // Track the button click
    await analytics.track(AnalyticsEvents.BUTTON_CLICKED, {
      button_id: trackingId,
      button_text: title,
      ...trackingProperties,
    });

    // Call the original onPress handler
    onPress?.(event);
  };

  return (
    <TouchableOpacity {...props} onPress={handlePress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Higher-Order Component for Tracking

```typescript
// analytics/withTracking.tsx

import React, { ComponentType } from 'react';
import { analytics } from './AnalyticsService';

interface TrackingConfig {
  eventName: string;
  getProperties?: (props: any) => Record<string, any>;
  trackOnMount?: boolean;
  trackOnUnmount?: boolean;
}

export function withTracking<P extends object>(
  WrappedComponent: ComponentType<P>,
  config: TrackingConfig
) {
  return function TrackedComponent(props: P) {
    const { eventName, getProperties, trackOnMount, trackOnUnmount } = config;

    React.useEffect(() => {
      if (trackOnMount) {
        const properties = getProperties ? getProperties(props) : {};
        analytics.track(`${eventName}_viewed`, properties);
      }

      return () => {
        if (trackOnUnmount) {
          const properties = getProperties ? getProperties(props) : {};
          analytics.track(`${eventName}_closed`, properties);
        }
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
}

// Usage
const TrackedProductCard = withTracking(ProductCard, {
  eventName: 'product_card',
  getProperties: (props) => ({
    product_id: props.productId,
    product_name: props.name,
  }),
  trackOnMount: true,
});
```

## Conversion Funnel Events

Track users through your conversion funnel to identify drop-off points.

### Funnel Tracking Implementation

```typescript
// analytics/FunnelTracker.ts

import { analytics } from './AnalyticsService';

interface FunnelStep {
  stepNumber: number;
  stepName: string;
  timestamp: number;
  properties?: Record<string, any>;
}

class FunnelTracker {
  private funnels: Map<string, FunnelStep[]> = new Map();

  startFunnel(funnelId: string, funnelName: string): void {
    this.funnels.set(funnelId, []);

    analytics.track('funnel_started', {
      funnel_id: funnelId,
      funnel_name: funnelName,
      started_at: new Date().toISOString(),
    });
  }

  trackStep(
    funnelId: string,
    stepNumber: number,
    stepName: string,
    properties: Record<string, any> = {}
  ): void {
    const funnel = this.funnels.get(funnelId);

    if (!funnel) {
      console.warn(`Funnel ${funnelId} not found. Start the funnel first.`);
      return;
    }

    const step: FunnelStep = {
      stepNumber,
      stepName,
      timestamp: Date.now(),
      properties,
    };

    funnel.push(step);

    const previousStep = funnel[funnel.length - 2];
    const timeFromPreviousStep = previousStep
      ? step.timestamp - previousStep.timestamp
      : 0;

    analytics.track('funnel_step_completed', {
      funnel_id: funnelId,
      step_number: stepNumber,
      step_name: stepName,
      time_from_previous_step_ms: timeFromPreviousStep,
      total_steps_completed: funnel.length,
      ...properties,
    });
  }

  completeFunnel(funnelId: string, properties: Record<string, any> = {}): void {
    const funnel = this.funnels.get(funnelId);

    if (!funnel || funnel.length === 0) {
      console.warn(`Funnel ${funnelId} not found or empty.`);
      return;
    }

    const totalDuration = Date.now() - funnel[0].timestamp;

    analytics.track('funnel_completed', {
      funnel_id: funnelId,
      total_steps: funnel.length,
      total_duration_ms: totalDuration,
      steps: funnel.map((s) => s.stepName),
      ...properties,
    });

    this.funnels.delete(funnelId);
  }

  abandonFunnel(funnelId: string, reason?: string): void {
    const funnel = this.funnels.get(funnelId);

    if (!funnel) return;

    const lastStep = funnel[funnel.length - 1];

    analytics.track('funnel_abandoned', {
      funnel_id: funnelId,
      abandoned_at_step: lastStep?.stepNumber || 0,
      abandoned_at_step_name: lastStep?.stepName || 'unknown',
      steps_completed: funnel.length,
      reason,
    });

    this.funnels.delete(funnelId);
  }
}

export const funnelTracker = new FunnelTracker();
```

### Checkout Funnel Example

```typescript
// screens/checkout/CheckoutFlow.tsx

import { funnelTracker } from '../../analytics/FunnelTracker';

const CHECKOUT_FUNNEL_ID = 'checkout';

// Start checkout
function startCheckout(cartItems: CartItem[]) {
  funnelTracker.startFunnel(CHECKOUT_FUNNEL_ID, 'Checkout Flow');

  funnelTracker.trackStep(CHECKOUT_FUNNEL_ID, 1, 'cart_review', {
    item_count: cartItems.length,
    cart_total: calculateTotal(cartItems),
  });
}

// Shipping step
function completeShippingStep(shippingMethod: string) {
  funnelTracker.trackStep(CHECKOUT_FUNNEL_ID, 2, 'shipping_info', {
    shipping_method: shippingMethod,
  });
}

// Payment step
function completePaymentStep(paymentMethod: string) {
  funnelTracker.trackStep(CHECKOUT_FUNNEL_ID, 3, 'payment_info', {
    payment_method: paymentMethod,
  });
}

// Order confirmation
function completeOrder(orderId: string, total: number) {
  funnelTracker.trackStep(CHECKOUT_FUNNEL_ID, 4, 'order_confirmed', {
    order_id: orderId,
    order_total: total,
  });

  funnelTracker.completeFunnel(CHECKOUT_FUNNEL_ID, {
    order_id: orderId,
    final_total: total,
  });
}

// Handle abandonment
function handleCheckoutExit() {
  funnelTracker.abandonFunnel(CHECKOUT_FUNNEL_ID, 'user_navigated_away');
}
```

## E-commerce Event Tracking

Implement comprehensive e-commerce tracking following industry standards.

### E-commerce Analytics Module

```typescript
// analytics/EcommerceAnalytics.ts

import { analytics } from './AnalyticsService';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  quantity?: number;
  variant?: string;
  brand?: string;
}

interface Order {
  orderId: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  currency: string;
  coupon?: string;
  products: Product[];
}

class EcommerceAnalytics {
  // Product Impressions
  trackProductImpression(products: Product[], listName: string): void {
    analytics.track('product_list_viewed', {
      list_name: listName,
      products: products.map((p, index) => ({
        ...p,
        position: index + 1,
      })),
      product_count: products.length,
    });
  }

  // Product Click
  trackProductClick(product: Product, listName: string, position: number): void {
    analytics.track('product_clicked', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      list_name: listName,
      position,
    });
  }

  // Product View
  trackProductView(product: Product): void {
    analytics.track('product_viewed', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      brand: product.brand,
      variant: product.variant,
    });
  }

  // Add to Cart
  trackAddToCart(product: Product, quantity: number, cartTotal: number): void {
    analytics.track('product_added_to_cart', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      quantity,
      cart_total: cartTotal,
    });
  }

  // Remove from Cart
  trackRemoveFromCart(product: Product, quantity: number, cartTotal: number): void {
    analytics.track('product_removed_from_cart', {
      product_id: product.id,
      product_name: product.name,
      quantity,
      cart_total: cartTotal,
    });
  }

  // View Cart
  trackCartView(products: Product[], cartTotal: number): void {
    analytics.track('cart_viewed', {
      products: products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        price: p.price,
        quantity: p.quantity,
      })),
      item_count: products.reduce((sum, p) => sum + (p.quantity || 1), 0),
      cart_total: cartTotal,
    });
  }

  // Begin Checkout
  trackCheckoutStarted(products: Product[], cartTotal: number): void {
    analytics.track('checkout_started', {
      products: products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        price: p.price,
        quantity: p.quantity,
      })),
      item_count: products.reduce((sum, p) => sum + (p.quantity || 1), 0),
      cart_total: cartTotal,
    });
  }

  // Checkout Step
  trackCheckoutStep(stepNumber: number, stepName: string, options?: Record<string, any>): void {
    analytics.track('checkout_step_completed', {
      step_number: stepNumber,
      step_name: stepName,
      ...options,
    });
  }

  // Purchase Complete
  trackPurchase(order: Order): void {
    analytics.track('purchase_completed', {
      order_id: order.orderId,
      total: order.total,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      currency: order.currency,
      coupon: order.coupon,
      products: order.products.map((p) => ({
        product_id: p.id,
        product_name: p.name,
        category: p.category,
        price: p.price,
        quantity: p.quantity || 1,
      })),
      item_count: order.products.reduce((sum, p) => sum + (p.quantity || 1), 0),
    });
  }

  // Refund
  trackRefund(orderId: string, products?: Product[], refundAmount?: number): void {
    analytics.track('order_refunded', {
      order_id: orderId,
      refund_amount: refundAmount,
      products: products?.map((p) => ({
        product_id: p.id,
        quantity: p.quantity,
      })),
      full_refund: !products,
    });
  }

  // Promotion Events
  trackPromotionViewed(promotionId: string, promotionName: string, creative?: string): void {
    analytics.track('promotion_viewed', {
      promotion_id: promotionId,
      promotion_name: promotionName,
      creative,
    });
  }

  trackPromotionClicked(promotionId: string, promotionName: string, creative?: string): void {
    analytics.track('promotion_clicked', {
      promotion_id: promotionId,
      promotion_name: promotionName,
      creative,
    });
  }
}

export const ecommerceAnalytics = new EcommerceAnalytics();
```

## User Identification

Properly identify users to connect anonymous and authenticated sessions.

### User Identity Management

```typescript
// analytics/UserIdentity.ts

import { analytics } from './AnalyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANONYMOUS_ID_KEY = '@analytics_anonymous_id';

class UserIdentityManager {
  private anonymousId: string | null = null;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    this.anonymousId = await this.getOrCreateAnonymousId();
  }

  private async getOrCreateAnonymousId(): Promise<string> {
    let anonymousId = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);

    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    }

    return anonymousId;
  }

  async identify(userId: string, traits: Record<string, any> = {}): Promise<void> {
    const previousAnonymousId = this.anonymousId;
    this.userId = userId;

    // Track the identification event
    analytics.track('user_identified', {
      user_id: userId,
      previous_anonymous_id: previousAnonymousId,
      ...traits,
    });

    // Set user context for future events
    analytics.setUser({
      userId,
      ...traits,
    });

    // Alias anonymous ID to user ID for connecting sessions
    await this.alias(previousAnonymousId!, userId);
  }

  private async alias(anonymousId: string, userId: string): Promise<void> {
    analytics.track('user_alias_created', {
      anonymous_id: anonymousId,
      user_id: userId,
    });
  }

  async reset(): Promise<void> {
    this.userId = null;
    this.anonymousId = await this.getOrCreateAnonymousId();

    analytics.clearUser();

    analytics.track('user_session_reset', {
      new_anonymous_id: this.anonymousId,
    });
  }

  getUserId(): string | null {
    return this.userId;
  }

  getAnonymousId(): string | null {
    return this.anonymousId;
  }
}

export const userIdentity = new UserIdentityManager();
```

## Event Batching and Throttling

Optimize performance by batching events and preventing event flooding.

### Event Queue Implementation

```typescript
// analytics/EventQueue.ts

interface QueuedEvent {
  eventName: string;
  properties: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

interface EventQueueConfig {
  maxBatchSize: number;
  flushInterval: number;
  maxRetries: number;
  throttleMs: number;
}

class EventQueue {
  private queue: QueuedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastEventTime: Map<string, number> = new Map();
  private config: EventQueueConfig;

  constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = {
      maxBatchSize: 20,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      throttleMs: 1000, // 1 second between same events
      ...config,
    };

    this.startFlushTimer();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private shouldThrottle(eventName: string): boolean {
    const lastTime = this.lastEventTime.get(eventName);
    const now = Date.now();

    if (lastTime && now - lastTime < this.config.throttleMs) {
      return true;
    }

    this.lastEventTime.set(eventName, now);
    return false;
  }

  enqueue(eventName: string, properties: Record<string, any>): boolean {
    // Check throttling for non-critical events
    const criticalEvents = ['purchase_completed', 'error_occurred', 'crash_detected'];

    if (!criticalEvents.includes(eventName) && this.shouldThrottle(eventName)) {
      console.log(`Event ${eventName} throttled`);
      return false;
    }

    const event: QueuedEvent = {
      eventName,
      properties,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(event);

    // Flush if batch size reached
    if (this.queue.length >= this.config.maxBatchSize) {
      this.flush();
    }

    return true;
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      await this.sendBatch(batch);
    } catch (error) {
      // Re-queue failed events with retry count
      const retryableEvents = batch
        .filter((e) => e.retryCount < this.config.maxRetries)
        .map((e) => ({ ...e, retryCount: e.retryCount + 1 }));

      this.queue.unshift(...retryableEvents);

      console.error('Failed to send analytics batch:', error);
    }
  }

  private async sendBatch(events: QueuedEvent[]): Promise<void> {
    // Send to your analytics backend
    const response = await fetch('https://analytics.example.com/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

export const eventQueue = new EventQueue();
```

## Privacy Considerations

Implement privacy controls to comply with regulations like GDPR and CCPA.

### Privacy-Aware Analytics

```typescript
// analytics/PrivacyManager.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './AnalyticsService';

const CONSENT_KEY = '@analytics_consent';
const DO_NOT_TRACK_KEY = '@analytics_do_not_track';

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  timestamp: string;
  version: string;
}

class PrivacyManager {
  private consent: ConsentPreferences | null = null;
  private doNotTrack: boolean = false;

  async initialize(): Promise<void> {
    const [consentStr, dntStr] = await Promise.all([
      AsyncStorage.getItem(CONSENT_KEY),
      AsyncStorage.getItem(DO_NOT_TRACK_KEY),
    ]);

    if (consentStr) {
      this.consent = JSON.parse(consentStr);
    }

    this.doNotTrack = dntStr === 'true';
  }

  async setConsent(preferences: Omit<ConsentPreferences, 'timestamp' | 'version'>): Promise<void> {
    this.consent = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(this.consent));

    // Track consent change (this is always allowed)
    analytics.track('consent_updated', {
      analytics_consent: preferences.analytics,
      marketing_consent: preferences.marketing,
      personalization_consent: preferences.personalization,
    });
  }

  async setDoNotTrack(enabled: boolean): Promise<void> {
    this.doNotTrack = enabled;
    await AsyncStorage.setItem(DO_NOT_TRACK_KEY, String(enabled));
  }

  canTrack(category: keyof Omit<ConsentPreferences, 'timestamp' | 'version'>): boolean {
    if (this.doNotTrack) return false;
    if (!this.consent) return false;
    return this.consent[category] === true;
  }

  getConsent(): ConsentPreferences | null {
    return this.consent;
  }

  // Sanitize PII from event properties
  sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const piiFields = ['email', 'phone', 'address', 'ip', 'name', 'ssn', 'credit_card'];
    const sanitized = { ...properties };

    for (const field of piiFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Hash identifiers for privacy
  hashIdentifier(identifier: string): string {
    // Simple hash function (use a proper crypto library in production)
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `hashed_${Math.abs(hash).toString(16)}`;
  }

  async deleteUserData(): Promise<void> {
    // Clear all stored analytics data
    await Promise.all([
      AsyncStorage.removeItem(CONSENT_KEY),
      AsyncStorage.removeItem(DO_NOT_TRACK_KEY),
      AsyncStorage.removeItem('@analytics_anonymous_id'),
    ]);

    analytics.track('user_data_deleted', {
      deletion_timestamp: new Date().toISOString(),
    });

    this.consent = null;
  }
}

export const privacyManager = new PrivacyManager();
```

### Consent Banner Component

```typescript
// components/ConsentBanner.tsx

import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { privacyManager } from '../analytics/PrivacyManager';

interface ConsentBannerProps {
  visible: boolean;
  onComplete: () => void;
}

export function ConsentBanner({ visible, onComplete }: ConsentBannerProps) {
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [personalizationConsent, setPersonalizationConsent] = useState(false);

  const handleAcceptAll = async () => {
    await privacyManager.setConsent({
      analytics: true,
      marketing: true,
      personalization: true,
    });
    onComplete();
  };

  const handleSavePreferences = async () => {
    await privacyManager.setConsent({
      analytics: analyticsConsent,
      marketing: marketingConsent,
      personalization: personalizationConsent,
    });
    onComplete();
  };

  const handleRejectAll = async () => {
    await privacyManager.setConsent({
      analytics: false,
      marketing: false,
      personalization: false,
    });
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Preferences</Text>
          <Text style={styles.description}>
            We use cookies and similar technologies to improve your experience.
            Please choose your preferences below.
          </Text>

          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Analytics</Text>
              <Text style={styles.optionDescription}>
                Help us understand how you use our app
              </Text>
            </View>
            <Switch value={analyticsConsent} onValueChange={setAnalyticsConsent} />
          </View>

          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Marketing</Text>
              <Text style={styles.optionDescription}>
                Receive personalized offers and promotions
              </Text>
            </View>
            <Switch value={marketingConsent} onValueChange={setMarketingConsent} />
          </View>

          <View style={styles.option}>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Personalization</Text>
              <Text style={styles.optionDescription}>
                Get recommendations based on your activity
              </Text>
            </View>
            <Switch value={personalizationConsent} onValueChange={setPersonalizationConsent} />
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.rejectButton} onPress={handleRejectAll}>
              <Text style={styles.rejectButtonText}>Reject All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSavePreferences}>
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptAll}>
              <Text style={styles.acceptButtonText}>Accept All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  rejectButton: {
    padding: 12,
  },
  rejectButtonText: {
    color: '#666',
  },
  saveButton: {
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#333',
  },
  acceptButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

## A/B Testing Integration

Integrate analytics with A/B testing for experiment tracking.

### Experiment Tracking

```typescript
// analytics/ExperimentTracker.ts

import { analytics } from './AnalyticsService';

interface Experiment {
  id: string;
  name: string;
  variant: string;
  startedAt: string;
}

interface ExperimentConfig {
  id: string;
  name: string;
  variants: string[];
  weights?: number[];
}

class ExperimentTracker {
  private activeExperiments: Map<string, Experiment> = new Map();

  assignVariant(config: ExperimentConfig): string {
    const { id, name, variants, weights } = config;

    // Check if already assigned
    const existing = this.activeExperiments.get(id);
    if (existing) {
      return existing.variant;
    }

    // Assign variant based on weights or random
    const variant = weights
      ? this.weightedRandomVariant(variants, weights)
      : variants[Math.floor(Math.random() * variants.length)];

    const experiment: Experiment = {
      id,
      name,
      variant,
      startedAt: new Date().toISOString(),
    };

    this.activeExperiments.set(id, experiment);

    // Track experiment assignment
    analytics.track('experiment_assigned', {
      experiment_id: id,
      experiment_name: name,
      variant,
      assigned_at: experiment.startedAt,
    });

    return variant;
  }

  private weightedRandomVariant(variants: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return variants[i];
      }
    }

    return variants[variants.length - 1];
  }

  trackExperimentExposure(experimentId: string): void {
    const experiment = this.activeExperiments.get(experimentId);

    if (!experiment) {
      console.warn(`Experiment ${experimentId} not found`);
      return;
    }

    analytics.track('experiment_exposure', {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      variant: experiment.variant,
    });
  }

  trackExperimentConversion(experimentId: string, conversionType: string, value?: number): void {
    const experiment = this.activeExperiments.get(experimentId);

    if (!experiment) {
      console.warn(`Experiment ${experimentId} not found`);
      return;
    }

    analytics.track('experiment_conversion', {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      variant: experiment.variant,
      conversion_type: conversionType,
      conversion_value: value,
    });
  }

  getVariant(experimentId: string): string | undefined {
    return this.activeExperiments.get(experimentId)?.variant;
  }

  getActiveExperiments(): Experiment[] {
    return Array.from(this.activeExperiments.values());
  }
}

export const experimentTracker = new ExperimentTracker();
```

### Using Experiments in Components

```typescript
// hooks/useExperiment.ts

import { useEffect, useState } from 'react';
import { experimentTracker } from '../analytics/ExperimentTracker';

interface UseExperimentOptions {
  experimentId: string;
  experimentName: string;
  variants: string[];
  weights?: number[];
  trackExposure?: boolean;
}

export function useExperiment(options: UseExperimentOptions) {
  const { experimentId, experimentName, variants, weights, trackExposure = true } = options;

  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const assignedVariant = experimentTracker.assignVariant({
      id: experimentId,
      name: experimentName,
      variants,
      weights,
    });

    setVariant(assignedVariant);

    if (trackExposure) {
      experimentTracker.trackExperimentExposure(experimentId);
    }
  }, [experimentId]);

  const trackConversion = (conversionType: string, value?: number) => {
    experimentTracker.trackExperimentConversion(experimentId, conversionType, value);
  };

  return {
    variant,
    isControl: variant === variants[0],
    trackConversion,
  };
}

// Usage in component
function CheckoutButton() {
  const { variant, trackConversion } = useExperiment({
    experimentId: 'checkout_button_color',
    experimentName: 'Checkout Button Color Test',
    variants: ['control', 'green', 'orange'],
    weights: [0.34, 0.33, 0.33],
  });

  const buttonColors = {
    control: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
  };

  const handlePress = () => {
    trackConversion('button_clicked');
    // Proceed with checkout
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: buttonColors[variant || 'control'] }]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>Checkout</Text>
    </TouchableOpacity>
  );
}
```

## Analytics Debugging Tools

Build tools to debug and validate your analytics implementation.

### Debug Logger

```typescript
// analytics/DebugLogger.ts

import { Platform } from 'react-native';

interface LoggedEvent {
  timestamp: string;
  eventName: string;
  properties: Record<string, any>;
  context: Record<string, any>;
}

class AnalyticsDebugger {
  private isEnabled: boolean = __DEV__;
  private eventLog: LoggedEvent[] = [];
  private maxLogSize: number = 100;
  private listeners: ((event: LoggedEvent) => void)[] = [];

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  log(eventName: string, properties: Record<string, any>, context: Record<string, any>): void {
    if (!this.isEnabled) return;

    const loggedEvent: LoggedEvent = {
      timestamp: new Date().toISOString(),
      eventName,
      properties,
      context,
    };

    // Add to log
    this.eventLog.push(loggedEvent);

    // Trim if too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Console output
    console.group(`[Analytics] ${eventName}`);
    console.log('Properties:', properties);
    console.log('Context:', context);
    console.log('Timestamp:', loggedEvent.timestamp);
    console.groupEnd();

    // Notify listeners
    this.listeners.forEach((listener) => listener(loggedEvent));
  }

  getLog(): LoggedEvent[] {
    return [...this.eventLog];
  }

  clearLog(): void {
    this.eventLog = [];
  }

  searchLog(query: string): LoggedEvent[] {
    const lowerQuery = query.toLowerCase();
    return this.eventLog.filter(
      (event) =>
        event.eventName.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(event.properties).toLowerCase().includes(lowerQuery)
    );
  }

  addListener(listener: (event: LoggedEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  exportLog(): string {
    return JSON.stringify(this.eventLog, null, 2);
  }

  validateEvent(eventName: string, properties: Record<string, any>, schema: Record<string, any>): string[] {
    const errors: string[] = [];

    // Check required properties
    for (const [key, config] of Object.entries(schema)) {
      if (config.required && !(key in properties)) {
        errors.push(`Missing required property: ${key}`);
      }

      if (key in properties && config.type) {
        const actualType = typeof properties[key];
        if (actualType !== config.type) {
          errors.push(`Property ${key} should be ${config.type}, got ${actualType}`);
        }
      }
    }

    // Check for unknown properties
    for (const key of Object.keys(properties)) {
      if (!(key in schema)) {
        errors.push(`Unknown property: ${key}`);
      }
    }

    if (errors.length > 0) {
      console.warn(`[Analytics Validation] ${eventName}:`, errors);
    }

    return errors;
  }
}

export const analyticsDebugger = new AnalyticsDebugger();
```

### Debug Overlay Component

```typescript
// components/AnalyticsDebugOverlay.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { analyticsDebugger } from '../analytics/DebugLogger';

export function AnalyticsDebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = analyticsDebugger.addListener((event) => {
      setEvents((prev) => [...prev.slice(-49), event]);
    });

    return unsubscribe;
  }, []);

  const filteredEvents = searchQuery
    ? analyticsDebugger.searchLog(searchQuery)
    : events;

  if (!__DEV__) return null;

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.floatingButtonText}>A</Text>
        {events.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{events.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Debug Modal */}
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Analytics Debug</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                analyticsDebugger.clearLog();
                setEvents([]);
              }}
            >
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const exported = analyticsDebugger.exportLog();
                console.log('Exported Analytics Log:', exported);
              }}
            >
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.eventList}>
            {filteredEvents.map((event, index) => (
              <TouchableOpacity
                key={index}
                style={styles.eventItem}
                onPress={() => setSelectedEvent(event)}
              >
                <Text style={styles.eventName}>{event.eventName}</Text>
                <Text style={styles.eventTime}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Event Detail Modal */}
          <Modal visible={!!selectedEvent} animationType="fade" transparent>
            <View style={styles.detailOverlay}>
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{selectedEvent?.eventName}</Text>
                <ScrollView>
                  <Text style={styles.detailLabel}>Properties:</Text>
                  <Text style={styles.detailJson}>
                    {JSON.stringify(selectedEvent?.properties, null, 2)}
                  </Text>
                  <Text style={styles.detailLabel}>Context:</Text>
                  <Text style={styles.detailJson}>
                    {JSON.stringify(selectedEvent?.context, null, 2)}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  style={styles.detailClose}
                  onPress={() => setSelectedEvent(null)}
                >
                  <Text style={styles.detailCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  searchInput: {
    margin: 10,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    gap: 10,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
  },
  eventList: {
    flex: 1,
    padding: 10,
  },
  eventItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  detailJson: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
  },
  detailClose: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  detailCloseText: {
    color: 'white',
    fontWeight: '600',
  },
});
```

## Conclusion

Implementing custom analytics events in React Native requires careful planning and execution. By following the patterns and best practices outlined in this guide, you can build a robust analytics system that provides valuable insights into user behavior while respecting privacy and maintaining performance.

Key takeaways:

1. **Plan your analytics strategy** before writing code to ensure you track meaningful events
2. **Use consistent naming conventions** for easy querying and maintenance
3. **Enrich events with context** to enable deeper analysis
4. **Implement proper user identification** to connect sessions
5. **Batch and throttle events** for optimal performance
6. **Respect user privacy** with consent management and data minimization
7. **Integrate with A/B testing** to measure experiment impact
8. **Build debugging tools** to validate your implementation

With these foundations in place, you will have a scalable analytics infrastructure that grows with your application and provides the data you need to make informed product decisions.

## Additional Resources

- [React Navigation Analytics Integration](https://reactnavigation.org/docs/screen-tracking/)
- [Google Analytics for Firebase](https://firebase.google.com/docs/analytics)
- [Segment React Native SDK](https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/)
- [Amplitude React Native SDK](https://www.docs.developers.amplitude.com/data/sdks/react-native/)
- [Mixpanel React Native SDK](https://developer.mixpanel.com/docs/react-native)
