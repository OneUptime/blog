# How to Track User Sessions and Journeys in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, User Sessions, Analytics, Mobile Development, User Journey, Tracking

Description: Learn how to track user sessions and journeys in React Native apps to understand user behavior and improve engagement.

---

Understanding how users interact with your React Native application is crucial for building better products. User session tracking and journey mapping provide invaluable insights into user behavior, helping you identify friction points, optimize conversion funnels, and ultimately improve user engagement. In this comprehensive guide, we will explore everything you need to know about implementing robust session and journey tracking in your React Native applications.

## What is a User Session?

A user session represents a continuous period of user activity within your application. It begins when a user opens your app and ends when they close it, switch to another app for an extended period, or remain inactive for a specified timeout duration. Sessions are fundamental units of user engagement measurement.

### Key Session Characteristics

Sessions typically include:

- **Start time**: When the user opens the app or returns from background
- **End time**: When the user closes the app or becomes inactive
- **Duration**: Total time spent in the session
- **Screen views**: Pages or screens visited during the session
- **Events**: Actions taken by the user
- **Context**: Device information, location, and other metadata

## Setting Up Session Tracking Infrastructure

Before implementing session tracking, you need to establish a solid foundation. Let us start by creating a session management service.

### Session Manager Implementation

```typescript
// src/services/SessionManager.ts
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

interface SessionData {
  sessionId: string;
  userId: string | null;
  startTime: number;
  endTime: number | null;
  duration: number;
  screenViews: ScreenView[];
  events: SessionEvent[];
  deviceInfo: DeviceInfo;
  isActive: boolean;
}

interface ScreenView {
  screenName: string;
  timestamp: number;
  duration: number;
  previousScreen: string | null;
}

interface SessionEvent {
  eventName: string;
  timestamp: number;
  properties: Record<string, unknown>;
  screenContext: string;
}

interface DeviceInfo {
  platform: string;
  version: string;
  deviceId: string;
  appVersion: string;
}

class SessionManager {
  private static instance: SessionManager;
  private currentSession: SessionData | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private lastActivityTime: number = 0;
  private appStateSubscription: any = null;
  private currentScreen: string = '';

  private constructor() {
    this.initializeAppStateListener();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private initializeAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    const now = Date.now();

    if (nextAppState === 'active') {
      // App came to foreground
      if (this.shouldStartNewSession()) {
        await this.startNewSession();
      } else if (this.currentSession) {
        // Resume existing session
        this.currentSession.isActive = true;
        await this.trackEvent('session_resumed', {
          backgroundDuration: now - this.lastActivityTime,
        });
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background
      if (this.currentSession) {
        this.currentSession.isActive = false;
        await this.trackEvent('session_backgrounded', {});
        await this.persistSession();
      }
    }

    this.lastActivityTime = now;
  }

  private shouldStartNewSession(): boolean {
    if (!this.currentSession) return true;

    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return timeSinceLastActivity > this.sessionTimeout;
  }

  public async startNewSession(): Promise<string> {
    // End previous session if exists
    if (this.currentSession) {
      await this.endSession();
    }

    const sessionId = uuidv4();
    const now = Date.now();

    this.currentSession = {
      sessionId,
      userId: await this.getUserId(),
      startTime: now,
      endTime: null,
      duration: 0,
      screenViews: [],
      events: [],
      deviceInfo: await this.getDeviceInfo(),
      isActive: true,
    };

    this.lastActivityTime = now;

    await this.trackEvent('session_started', {
      isFirstSession: await this.isFirstSession(),
    });

    return sessionId;
  }

  public async endSession(): Promise<void> {
    if (!this.currentSession) return;

    const now = Date.now();
    this.currentSession.endTime = now;
    this.currentSession.duration = now - this.currentSession.startTime;
    this.currentSession.isActive = false;

    await this.trackEvent('session_ended', {
      totalDuration: this.currentSession.duration,
      screenCount: this.currentSession.screenViews.length,
      eventCount: this.currentSession.events.length,
    });

    await this.persistSession();
    await this.sendSessionToAnalytics();

    this.currentSession = null;
  }

  private async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem('userId');
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      deviceId: await this.getOrCreateDeviceId(),
      appVersion: '1.0.0', // Replace with actual app version
    };
  }

  private async getOrCreateDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private async isFirstSession(): Promise<boolean> {
    const hasHadSession = await AsyncStorage.getItem('hasHadSession');
    if (!hasHadSession) {
      await AsyncStorage.setItem('hasHadSession', 'true');
      return true;
    }
    return false;
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) return;

    const sessions = await this.getStoredSessions();
    sessions.push({ ...this.currentSession });

    // Keep only last 10 sessions locally
    const recentSessions = sessions.slice(-10);
    await AsyncStorage.setItem('sessions', JSON.stringify(recentSessions));
  }

  private async getStoredSessions(): Promise<SessionData[]> {
    const sessionsJson = await AsyncStorage.getItem('sessions');
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  }

  private async sendSessionToAnalytics(): Promise<void> {
    if (!this.currentSession) return;

    // Send to your analytics backend
    try {
      await fetch('https://your-analytics-api.com/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.currentSession),
      });
    } catch (error) {
      console.error('Failed to send session data:', error);
      // Queue for retry
      await this.queueSessionForRetry(this.currentSession);
    }
  }

  private async queueSessionForRetry(session: SessionData): Promise<void> {
    const queue = await AsyncStorage.getItem('sessionRetryQueue');
    const sessions = queue ? JSON.parse(queue) : [];
    sessions.push(session);
    await AsyncStorage.setItem('sessionRetryQueue', JSON.stringify(sessions));
  }

  public async trackEvent(
    eventName: string,
    properties: Record<string, unknown>
  ): Promise<void> {
    if (!this.currentSession) {
      await this.startNewSession();
    }

    const event: SessionEvent = {
      eventName,
      timestamp: Date.now(),
      properties,
      screenContext: this.currentScreen,
    };

    this.currentSession!.events.push(event);
    this.lastActivityTime = Date.now();
  }

  public getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  public setCurrentScreen(screenName: string): void {
    this.currentScreen = screenName;
  }

  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export default SessionManager;
```

## Detecting Session Start and End

Properly detecting when a session starts and ends is critical for accurate analytics. React Native provides several mechanisms for this.

### App State Handling

```typescript
// src/hooks/useSessionTracking.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SessionManager from '../services/SessionManager';

interface UseSessionTrackingOptions {
  sessionTimeout?: number;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionData: any) => void;
}

export function useSessionTracking(options: UseSessionTrackingOptions = {}) {
  const {
    sessionTimeout = 30 * 60 * 1000,
    onSessionStart,
    onSessionEnd,
  } = options;

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTime = useRef<number>(0);
  const sessionManager = SessionManager.getInstance();

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const now = Date.now();

      // App is coming to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const timeInBackground = now - backgroundTime.current;

        if (timeInBackground > sessionTimeout) {
          // Start new session if timeout exceeded
          const newSessionId = await sessionManager.startNewSession();
          onSessionStart?.(newSessionId);
        } else {
          // Resume session
          await sessionManager.trackEvent('app_foregrounded', {
            backgroundDuration: timeInBackground,
          });
        }
      }

      // App is going to background
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        backgroundTime.current = now;
        await sessionManager.trackEvent('app_backgrounded', {});
      }

      appState.current = nextAppState;
    },
    [sessionTimeout, onSessionStart, sessionManager]
  );

  useEffect(() => {
    // Start session on mount
    sessionManager.startNewSession().then((sessionId) => {
      onSessionStart?.(sessionId);
    });

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      sessionManager.endSession().then(() => {
        onSessionEnd?.(null);
      });
    };
  }, [handleAppStateChange, onSessionStart, onSessionEnd, sessionManager]);

  return {
    trackEvent: sessionManager.trackEvent.bind(sessionManager),
    getSessionId: sessionManager.getSessionId.bind(sessionManager),
  };
}
```

### Session Timeout Configuration

```typescript
// src/config/sessionConfig.ts
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes default)
  TIMEOUT: 30 * 60 * 1000,

  // Minimum session duration to track (ignore very short sessions)
  MIN_DURATION: 3000,

  // Maximum events per session before batching
  MAX_EVENTS_BEFORE_FLUSH: 100,

  // Heartbeat interval to check session health
  HEARTBEAT_INTERVAL: 60 * 1000,

  // Maximum stored sessions for offline support
  MAX_STORED_SESSIONS: 50,
};
```

## Screen Flow Tracking

Tracking how users navigate through your app is essential for understanding their journey.

### Navigation Integration

```typescript
// src/navigation/NavigationTracker.tsx
import React, { useRef, useEffect } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import SessionManager from '../services/SessionManager';

interface ScreenVisit {
  screenName: string;
  entryTime: number;
  exitTime: number | null;
  params: Record<string, unknown>;
}

class NavigationTracker {
  private static instance: NavigationTracker;
  private screenHistory: ScreenVisit[] = [];
  private currentScreenVisit: ScreenVisit | null = null;
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
  }

  public static getInstance(): NavigationTracker {
    if (!NavigationTracker.instance) {
      NavigationTracker.instance = new NavigationTracker();
    }
    return NavigationTracker.instance;
  }

  public trackScreenChange(
    currentScreen: string,
    previousScreen: string | null,
    params: Record<string, unknown> = {}
  ): void {
    const now = Date.now();

    // End previous screen visit
    if (this.currentScreenVisit) {
      this.currentScreenVisit.exitTime = now;
      this.screenHistory.push({ ...this.currentScreenVisit });

      // Track screen exit event
      this.sessionManager.trackEvent('screen_exit', {
        screenName: this.currentScreenVisit.screenName,
        duration: now - this.currentScreenVisit.entryTime,
        nextScreen: currentScreen,
      });
    }

    // Start new screen visit
    this.currentScreenVisit = {
      screenName: currentScreen,
      entryTime: now,
      exitTime: null,
      params,
    };

    // Update session manager with current screen
    this.sessionManager.setCurrentScreen(currentScreen);

    // Track screen enter event
    this.sessionManager.trackEvent('screen_view', {
      screenName: currentScreen,
      previousScreen,
      params: this.sanitizeParams(params),
    });
  }

  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive data from params
    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'token', 'secret', 'creditCard'];

    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  public getScreenHistory(): ScreenVisit[] {
    return [...this.screenHistory];
  }

  public getCurrentScreen(): string | null {
    return this.currentScreenVisit?.screenName || null;
  }

  public getScreenDuration(screenName: string): number {
    const visits = this.screenHistory.filter((v) => v.screenName === screenName);
    return visits.reduce((total, visit) => {
      const duration = (visit.exitTime || Date.now()) - visit.entryTime;
      return total + duration;
    }, 0);
  }
}

// Navigation Container Wrapper
export function TrackedNavigationContainer({ children }: { children: React.ReactNode }) {
  const navigationRef = useRef<any>(null);
  const routeNameRef = useRef<string | null>(null);
  const tracker = NavigationTracker.getInstance();

  const getActiveRouteName = (state: NavigationState | undefined): string => {
    if (!state) return '';

    const route = state.routes[state.index];
    if (route.state) {
      return getActiveRouteName(route.state as NavigationState);
    }
    return route.name;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const currentRoute = getActiveRouteName(navigationRef.current?.getState());
        routeNameRef.current = currentRoute;
        tracker.trackScreenChange(currentRoute, null);
      }}
      onStateChange={() => {
        const previousRoute = routeNameRef.current;
        const currentRoute = getActiveRouteName(navigationRef.current?.getState());

        if (previousRoute !== currentRoute) {
          tracker.trackScreenChange(currentRoute, previousRoute);
          routeNameRef.current = currentRoute;
        }
      }}
    >
      {children}
    </NavigationContainer>
  );
}

export default NavigationTracker;
```

## User Journey Mapping

User journeys represent the complete path users take through your application to accomplish specific goals.

### Journey Definition and Tracking

```typescript
// src/services/JourneyTracker.ts
import SessionManager from './SessionManager';

interface JourneyStep {
  stepName: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  success: boolean;
}

interface Journey {
  journeyId: string;
  journeyName: string;
  startTime: number;
  endTime: number | null;
  steps: JourneyStep[];
  completed: boolean;
  abandonedAt: string | null;
}

interface JourneyDefinition {
  name: string;
  steps: string[];
  optionalSteps?: string[];
  timeout: number;
}

class JourneyTracker {
  private static instance: JourneyTracker;
  private activeJourneys: Map<string, Journey> = new Map();
  private journeyDefinitions: Map<string, JourneyDefinition> = new Map();
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.registerDefaultJourneys();
  }

  public static getInstance(): JourneyTracker {
    if (!JourneyTracker.instance) {
      JourneyTracker.instance = new JourneyTracker();
    }
    return JourneyTracker.instance;
  }

  private registerDefaultJourneys(): void {
    // Registration journey
    this.defineJourney({
      name: 'user_registration',
      steps: ['registration_started', 'email_entered', 'password_created', 'registration_completed'],
      optionalSteps: ['social_signup_selected'],
      timeout: 10 * 60 * 1000, // 10 minutes
    });

    // Checkout journey
    this.defineJourney({
      name: 'checkout',
      steps: ['cart_viewed', 'checkout_started', 'shipping_entered', 'payment_entered', 'order_placed'],
      optionalSteps: ['coupon_applied', 'shipping_method_changed'],
      timeout: 30 * 60 * 1000, // 30 minutes
    });

    // Onboarding journey
    this.defineJourney({
      name: 'onboarding',
      steps: ['onboarding_started', 'profile_setup', 'preferences_set', 'onboarding_completed'],
      optionalSteps: ['tutorial_viewed', 'skip_pressed'],
      timeout: 15 * 60 * 1000, // 15 minutes
    });
  }

  public defineJourney(definition: JourneyDefinition): void {
    this.journeyDefinitions.set(definition.name, definition);
  }

  public startJourney(journeyName: string, metadata: Record<string, unknown> = {}): string {
    const definition = this.journeyDefinitions.get(journeyName);
    if (!definition) {
      console.warn(`Journey "${journeyName}" is not defined`);
      return '';
    }

    const journeyId = `${journeyName}_${Date.now()}`;
    const journey: Journey = {
      journeyId,
      journeyName,
      startTime: Date.now(),
      endTime: null,
      steps: [],
      completed: false,
      abandonedAt: null,
    };

    this.activeJourneys.set(journeyId, journey);

    this.sessionManager.trackEvent('journey_started', {
      journeyId,
      journeyName,
      ...metadata,
    });

    // Set timeout for journey abandonment
    setTimeout(() => {
      this.checkJourneyTimeout(journeyId);
    }, definition.timeout);

    return journeyId;
  }

  public trackJourneyStep(
    journeyId: string,
    stepName: string,
    metadata: Record<string, unknown> = {},
    success: boolean = true
  ): void {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) {
      console.warn(`Journey "${journeyId}" not found`);
      return;
    }

    const step: JourneyStep = {
      stepName,
      timestamp: Date.now(),
      metadata,
      success,
    };

    journey.steps.push(step);

    this.sessionManager.trackEvent('journey_step', {
      journeyId,
      journeyName: journey.journeyName,
      stepName,
      stepNumber: journey.steps.length,
      success,
      ...metadata,
    });

    // Check if journey is completed
    const definition = this.journeyDefinitions.get(journey.journeyName);
    if (definition) {
      const completedSteps = new Set(journey.steps.map((s) => s.stepName));
      const allRequiredStepsCompleted = definition.steps.every((step) =>
        completedSteps.has(step)
      );

      if (allRequiredStepsCompleted) {
        this.completeJourney(journeyId);
      }
    }
  }

  public completeJourney(journeyId: string): void {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    journey.endTime = Date.now();
    journey.completed = true;

    this.sessionManager.trackEvent('journey_completed', {
      journeyId,
      journeyName: journey.journeyName,
      duration: journey.endTime - journey.startTime,
      stepsCount: journey.steps.length,
    });

    this.activeJourneys.delete(journeyId);
  }

  public abandonJourney(journeyId: string, reason: string): void {
    const journey = this.activeJourneys.get(journeyId);
    if (!journey) return;

    const lastStep = journey.steps[journey.steps.length - 1];
    journey.endTime = Date.now();
    journey.completed = false;
    journey.abandonedAt = lastStep?.stepName || 'not_started';

    this.sessionManager.trackEvent('journey_abandoned', {
      journeyId,
      journeyName: journey.journeyName,
      abandonedAt: journey.abandonedAt,
      reason,
      duration: journey.endTime - journey.startTime,
      stepsCompleted: journey.steps.length,
    });

    this.activeJourneys.delete(journeyId);
  }

  private checkJourneyTimeout(journeyId: string): void {
    const journey = this.activeJourneys.get(journeyId);
    if (journey && !journey.completed) {
      this.abandonJourney(journeyId, 'timeout');
    }
  }

  public getActiveJourneys(): Journey[] {
    return Array.from(this.activeJourneys.values());
  }
}

export default JourneyTracker;
```

## Funnel Analysis Implementation

Funnels help you understand conversion rates between steps in key user flows.

### Funnel Tracker

```typescript
// src/services/FunnelTracker.ts
import SessionManager from './SessionManager';

interface FunnelStep {
  name: string;
  timestamp: number;
  conversionTime: number | null;
}

interface Funnel {
  funnelId: string;
  funnelName: string;
  steps: FunnelStep[];
  startTime: number;
  currentStep: number;
  completed: boolean;
  droppedOff: boolean;
  dropOffStep: string | null;
}

interface FunnelDefinition {
  name: string;
  steps: string[];
}

interface FunnelAnalytics {
  funnelName: string;
  totalStarted: number;
  totalCompleted: number;
  conversionRate: number;
  stepConversions: {
    stepName: string;
    entered: number;
    completed: number;
    conversionRate: number;
    averageTime: number;
  }[];
  averageCompletionTime: number;
}

class FunnelTracker {
  private static instance: FunnelTracker;
  private activeFunnels: Map<string, Funnel> = new Map();
  private funnelDefinitions: Map<string, FunnelDefinition> = new Map();
  private completedFunnels: Funnel[] = [];
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.registerDefaultFunnels();
  }

  public static getInstance(): FunnelTracker {
    if (!FunnelTracker.instance) {
      FunnelTracker.instance = new FunnelTracker();
    }
    return FunnelTracker.instance;
  }

  private registerDefaultFunnels(): void {
    this.defineFunnel({
      name: 'signup_funnel',
      steps: ['landing_page', 'signup_clicked', 'form_filled', 'email_verified', 'profile_completed'],
    });

    this.defineFunnel({
      name: 'purchase_funnel',
      steps: ['product_viewed', 'add_to_cart', 'cart_viewed', 'checkout_started', 'purchase_completed'],
    });

    this.defineFunnel({
      name: 'feature_adoption_funnel',
      steps: ['feature_discovered', 'feature_clicked', 'feature_used', 'feature_completed'],
    });
  }

  public defineFunnel(definition: FunnelDefinition): void {
    this.funnelDefinitions.set(definition.name, definition);
  }

  public startFunnel(funnelName: string): string | null {
    const definition = this.funnelDefinitions.get(funnelName);
    if (!definition) {
      console.warn(`Funnel "${funnelName}" is not defined`);
      return null;
    }

    const funnelId = `${funnelName}_${Date.now()}`;
    const now = Date.now();

    const funnel: Funnel = {
      funnelId,
      funnelName,
      steps: [
        {
          name: definition.steps[0],
          timestamp: now,
          conversionTime: null,
        },
      ],
      startTime: now,
      currentStep: 0,
      completed: false,
      droppedOff: false,
      dropOffStep: null,
    };

    this.activeFunnels.set(funnelId, funnel);

    this.sessionManager.trackEvent('funnel_started', {
      funnelId,
      funnelName,
      firstStep: definition.steps[0],
    });

    return funnelId;
  }

  public progressFunnel(funnelId: string, stepName: string): boolean {
    const funnel = this.activeFunnels.get(funnelId);
    if (!funnel) return false;

    const definition = this.funnelDefinitions.get(funnel.funnelName);
    if (!definition) return false;

    const expectedStepIndex = funnel.currentStep + 1;
    const stepIndex = definition.steps.indexOf(stepName);

    // Validate step is the next expected step
    if (stepIndex !== expectedStepIndex) {
      console.warn(`Unexpected funnel step: expected ${definition.steps[expectedStepIndex]}, got ${stepName}`);
      return false;
    }

    const now = Date.now();
    const previousStep = funnel.steps[funnel.currentStep];
    previousStep.conversionTime = now - previousStep.timestamp;

    funnel.steps.push({
      name: stepName,
      timestamp: now,
      conversionTime: null,
    });
    funnel.currentStep = stepIndex;

    this.sessionManager.trackEvent('funnel_step_completed', {
      funnelId,
      funnelName: funnel.funnelName,
      stepName,
      stepNumber: stepIndex,
      timeFromPreviousStep: previousStep.conversionTime,
    });

    // Check if funnel is complete
    if (stepIndex === definition.steps.length - 1) {
      this.completeFunnel(funnelId);
    }

    return true;
  }

  private completeFunnel(funnelId: string): void {
    const funnel = this.activeFunnels.get(funnelId);
    if (!funnel) return;

    funnel.completed = true;
    const totalTime = Date.now() - funnel.startTime;

    this.sessionManager.trackEvent('funnel_completed', {
      funnelId,
      funnelName: funnel.funnelName,
      totalTime,
      stepsCount: funnel.steps.length,
    });

    this.completedFunnels.push(funnel);
    this.activeFunnels.delete(funnelId);
  }

  public dropOffFunnel(funnelId: string, reason?: string): void {
    const funnel = this.activeFunnels.get(funnelId);
    if (!funnel) return;

    const definition = this.funnelDefinitions.get(funnel.funnelName);
    const currentStepName = definition?.steps[funnel.currentStep] || 'unknown';

    funnel.droppedOff = true;
    funnel.dropOffStep = currentStepName;

    this.sessionManager.trackEvent('funnel_dropped_off', {
      funnelId,
      funnelName: funnel.funnelName,
      dropOffStep: currentStepName,
      stepsCompleted: funnel.currentStep,
      reason,
    });

    this.completedFunnels.push(funnel);
    this.activeFunnels.delete(funnelId);
  }

  public getFunnelAnalytics(funnelName: string): FunnelAnalytics | null {
    const funnels = this.completedFunnels.filter((f) => f.funnelName === funnelName);
    if (funnels.length === 0) return null;

    const definition = this.funnelDefinitions.get(funnelName);
    if (!definition) return null;

    const totalStarted = funnels.length;
    const totalCompleted = funnels.filter((f) => f.completed).length;

    const stepConversions = definition.steps.map((stepName, index) => {
      const enteredCount = funnels.filter((f) => f.steps.length > index).length;
      const completedCount = funnels.filter((f) => f.steps.length > index + 1 || f.completed).length;
      const conversionTimes = funnels
        .filter((f) => f.steps[index]?.conversionTime)
        .map((f) => f.steps[index].conversionTime!);

      return {
        stepName,
        entered: enteredCount,
        completed: completedCount,
        conversionRate: enteredCount > 0 ? (completedCount / enteredCount) * 100 : 0,
        averageTime:
          conversionTimes.length > 0
            ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
            : 0,
      };
    });

    const completedFunnelTimes = funnels
      .filter((f) => f.completed)
      .map((f) => {
        const lastStep = f.steps[f.steps.length - 1];
        return lastStep.timestamp - f.startTime;
      });

    return {
      funnelName,
      totalStarted,
      totalCompleted,
      conversionRate: totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0,
      stepConversions,
      averageCompletionTime:
        completedFunnelTimes.length > 0
          ? completedFunnelTimes.reduce((a, b) => a + b, 0) / completedFunnelTimes.length
          : 0,
    };
  }
}

export default FunnelTracker;
```

## Session Properties and Context

Adding rich context to sessions improves the quality of your analytics data.

### Context Manager

```typescript
// src/services/SessionContext.ts
import { Platform, Dimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

interface UserContext {
  userId: string | null;
  email: string | null;
  name: string | null;
  segment: string | null;
  attributes: Record<string, unknown>;
}

interface DeviceContext {
  deviceId: string;
  deviceModel: string;
  deviceBrand: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  screenWidth: number;
  screenHeight: number;
  screenScale: number;
  isTablet: boolean;
  hasNotch: boolean;
}

interface NetworkContext {
  connectionType: string | null;
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

interface SessionContext {
  user: UserContext;
  device: DeviceContext;
  network: NetworkContext;
  custom: Record<string, unknown>;
}

class SessionContextManager {
  private static instance: SessionContextManager;
  private context: SessionContext;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.context = {
      user: {
        userId: null,
        email: null,
        name: null,
        segment: null,
        attributes: {},
      },
      device: this.getInitialDeviceContext(),
      network: {
        connectionType: null,
        isConnected: true,
        isInternetReachable: null,
      },
      custom: {},
    };

    this.initializeNetworkListener();
    this.initializeDeviceInfo();
  }

  public static getInstance(): SessionContextManager {
    if (!SessionContextManager.instance) {
      SessionContextManager.instance = new SessionContextManager();
    }
    return SessionContextManager.instance;
  }

  private getInitialDeviceContext(): DeviceContext {
    const { width, height, scale } = Dimensions.get('window');

    return {
      deviceId: '',
      deviceModel: '',
      deviceBrand: '',
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
      appVersion: '',
      buildNumber: '',
      screenWidth: width,
      screenHeight: height,
      screenScale: scale,
      isTablet: false,
      hasNotch: false,
    };
  }

  private async initializeDeviceInfo(): Promise<void> {
    this.context.device = {
      ...this.context.device,
      deviceId: await DeviceInfo.getUniqueId(),
      deviceModel: DeviceInfo.getModel(),
      deviceBrand: DeviceInfo.getBrand(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      isTablet: DeviceInfo.isTablet(),
      hasNotch: DeviceInfo.hasNotch(),
    };
  }

  private initializeNetworkListener(): void {
    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      this.context.network = {
        connectionType: state.type,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
      };
    });
  }

  public setUser(userData: Partial<UserContext>): void {
    this.context.user = {
      ...this.context.user,
      ...userData,
    };
  }

  public setUserAttribute(key: string, value: unknown): void {
    this.context.user.attributes[key] = value;
  }

  public setCustomContext(key: string, value: unknown): void {
    this.context.custom[key] = value;
  }

  public getContext(): SessionContext {
    return { ...this.context };
  }

  public getUserContext(): UserContext {
    return { ...this.context.user };
  }

  public getDeviceContext(): DeviceContext {
    return { ...this.context.device };
  }

  public getNetworkContext(): NetworkContext {
    return { ...this.context.network };
  }

  public clearUserContext(): void {
    this.context.user = {
      userId: null,
      email: null,
      name: null,
      segment: null,
      attributes: {},
    };
  }

  public cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }
}

export default SessionContextManager;
```

## Cross-Session User Identification

Identifying users across sessions is essential for building a complete picture of user behavior.

### User Identification Service

```typescript
// src/services/UserIdentification.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import SessionManager from './SessionManager';
import SessionContextManager from './SessionContext';

interface UserIdentity {
  anonymousId: string;
  userId: string | null;
  traits: Record<string, unknown>;
  identifiedAt: number | null;
}

class UserIdentificationService {
  private static instance: UserIdentificationService;
  private identity: UserIdentity | null = null;
  private sessionManager: SessionManager;
  private contextManager: SessionContextManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.contextManager = SessionContextManager.getInstance();
    this.loadIdentity();
  }

  public static getInstance(): UserIdentificationService {
    if (!UserIdentificationService.instance) {
      UserIdentificationService.instance = new UserIdentificationService();
    }
    return UserIdentificationService.instance;
  }

  private async loadIdentity(): Promise<void> {
    const storedIdentity = await AsyncStorage.getItem('userIdentity');
    if (storedIdentity) {
      this.identity = JSON.parse(storedIdentity);
    } else {
      // Generate anonymous ID for new users
      this.identity = {
        anonymousId: this.generateAnonymousId(),
        userId: null,
        traits: {},
        identifiedAt: null,
      };
      await this.persistIdentity();
    }
  }

  private generateAnonymousId(): string {
    return 'anon_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private async persistIdentity(): Promise<void> {
    if (this.identity) {
      await AsyncStorage.setItem('userIdentity', JSON.stringify(this.identity));
    }
  }

  public async identify(userId: string, traits: Record<string, unknown> = {}): Promise<void> {
    if (!this.identity) {
      await this.loadIdentity();
    }

    const previousUserId = this.identity!.userId;
    const wasAnonymous = previousUserId === null;

    this.identity = {
      ...this.identity!,
      userId,
      traits: { ...this.identity!.traits, ...traits },
      identifiedAt: Date.now(),
    };

    await this.persistIdentity();

    // Update context manager
    this.contextManager.setUser({
      userId,
      ...traits,
    });

    // Track identification event
    await this.sessionManager.trackEvent('user_identified', {
      userId,
      previousUserId,
      wasAnonymous,
      traits: this.sanitizeTraits(traits),
    });

    // Handle alias if transitioning from anonymous to identified
    if (wasAnonymous) {
      await this.alias(this.identity!.anonymousId, userId);
    }
  }

  public async alias(previousId: string, newId: string): Promise<void> {
    await this.sessionManager.trackEvent('user_alias', {
      previousId,
      newId,
    });

    // Send alias to backend for merging user profiles
    try {
      await fetch('https://your-analytics-api.com/alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousId, newId }),
      });
    } catch (error) {
      console.error('Failed to send alias:', error);
    }
  }

  public async updateTraits(traits: Record<string, unknown>): Promise<void> {
    if (!this.identity) {
      await this.loadIdentity();
    }

    this.identity = {
      ...this.identity!,
      traits: { ...this.identity!.traits, ...traits },
    };

    await this.persistIdentity();

    // Update context manager
    Object.entries(traits).forEach(([key, value]) => {
      this.contextManager.setUserAttribute(key, value);
    });

    await this.sessionManager.trackEvent('traits_updated', {
      traits: this.sanitizeTraits(traits),
    });
  }

  private sanitizeTraits(traits: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...traits };
    const sensitiveKeys = ['password', 'ssn', 'creditCard', 'cvv'];

    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  public async reset(): Promise<void> {
    await this.sessionManager.trackEvent('user_reset', {
      previousUserId: this.identity?.userId,
    });

    this.identity = {
      anonymousId: this.generateAnonymousId(),
      userId: null,
      traits: {},
      identifiedAt: null,
    };

    await this.persistIdentity();
    this.contextManager.clearUserContext();
  }

  public getAnonymousId(): string {
    return this.identity?.anonymousId || '';
  }

  public getUserId(): string | null {
    return this.identity?.userId || null;
  }

  public getTraits(): Record<string, unknown> {
    return { ...this.identity?.traits } || {};
  }

  public isIdentified(): boolean {
    return this.identity?.userId !== null;
  }
}

export default UserIdentificationService;
```

## Session Replay Considerations

Session replay provides visual recordings of user sessions, offering deep insights into user behavior.

### Session Replay Integration

```typescript
// src/services/SessionReplay.ts
import { AppState, AppStateStatus } from 'react-native';
import SessionManager from './SessionManager';

interface ReplayEvent {
  type: 'touch' | 'scroll' | 'input' | 'navigation' | 'error' | 'custom';
  timestamp: number;
  data: Record<string, unknown>;
}

interface ReplayConfig {
  enabled: boolean;
  maskTextInputs: boolean;
  maskImages: boolean;
  sampleRate: number;
  maxDuration: number;
}

class SessionReplayService {
  private static instance: SessionReplayService;
  private config: ReplayConfig;
  private replayEvents: ReplayEvent[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.config = {
      enabled: true,
      maskTextInputs: true,
      maskImages: false,
      sampleRate: 0.1, // Record 10% of sessions
      maxDuration: 30 * 60 * 1000, // 30 minutes max
    };
  }

  public static getInstance(): SessionReplayService {
    if (!SessionReplayService.instance) {
      SessionReplayService.instance = new SessionReplayService();
    }
    return SessionReplayService.instance;
  }

  public configure(config: Partial<ReplayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public shouldRecord(): boolean {
    if (!this.config.enabled) return false;
    return Math.random() < this.config.sampleRate;
  }

  public startRecording(): void {
    if (!this.shouldRecord()) return;

    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.replayEvents = [];

    this.sessionManager.trackEvent('replay_started', {
      sampleRate: this.config.sampleRate,
    });
  }

  public stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    const duration = Date.now() - this.recordingStartTime;

    this.sessionManager.trackEvent('replay_stopped', {
      duration,
      eventCount: this.replayEvents.length,
    });

    this.uploadReplay();
  }

  public recordEvent(type: ReplayEvent['type'], data: Record<string, unknown>): void {
    if (!this.isRecording) return;

    // Check max duration
    if (Date.now() - this.recordingStartTime > this.config.maxDuration) {
      this.stopRecording();
      return;
    }

    const event: ReplayEvent = {
      type,
      timestamp: Date.now() - this.recordingStartTime,
      data: this.maskSensitiveData(data),
    };

    this.replayEvents.push(event);
  }

  public recordTouch(x: number, y: number, target?: string): void {
    this.recordEvent('touch', { x, y, target });
  }

  public recordScroll(scrollX: number, scrollY: number, target?: string): void {
    this.recordEvent('scroll', { scrollX, scrollY, target });
  }

  public recordInput(fieldName: string, value: string): void {
    const maskedValue = this.config.maskTextInputs ? this.maskValue(value) : value;
    this.recordEvent('input', { fieldName, value: maskedValue });
  }

  public recordNavigation(from: string, to: string): void {
    this.recordEvent('navigation', { from, to });
  }

  public recordError(error: Error, context?: Record<string, unknown>): void {
    this.recordEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitivePatterns = [
      /password/i,
      /credit/i,
      /card/i,
      /cvv/i,
      /ssn/i,
      /social/i,
    ];

    const masked = { ...data };

    Object.keys(masked).forEach((key) => {
      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        masked[key] = '[MASKED]';
      }
    });

    return masked;
  }

  private maskValue(value: string): string {
    if (value.length <= 2) return '*'.repeat(value.length);
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }

  private async uploadReplay(): Promise<void> {
    if (this.replayEvents.length === 0) return;

    const replayData = {
      sessionId: this.sessionManager.getSessionId(),
      startTime: this.recordingStartTime,
      duration: Date.now() - this.recordingStartTime,
      events: this.replayEvents,
    };

    try {
      await fetch('https://your-analytics-api.com/replays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replayData),
      });
    } catch (error) {
      console.error('Failed to upload replay:', error);
    }

    this.replayEvents = [];
  }
}

export default SessionReplayService;
```

## Privacy and Data Handling

Handling user data responsibly is crucial for compliance and user trust.

### Privacy Manager

```typescript
// src/services/PrivacyManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import SessionManager from './SessionManager';

interface ConsentSettings {
  analyticsEnabled: boolean;
  personalizedAdsEnabled: boolean;
  sessionReplayEnabled: boolean;
  crashReportingEnabled: boolean;
  lastUpdated: number;
}

interface DataRetentionPolicy {
  sessionDataDays: number;
  userDataDays: number;
  analyticsDataDays: number;
}

class PrivacyManager {
  private static instance: PrivacyManager;
  private consent: ConsentSettings;
  private retentionPolicy: DataRetentionPolicy;
  private sessionManager: SessionManager;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.consent = {
      analyticsEnabled: false,
      personalizedAdsEnabled: false,
      sessionReplayEnabled: false,
      crashReportingEnabled: true,
      lastUpdated: 0,
    };
    this.retentionPolicy = {
      sessionDataDays: 30,
      userDataDays: 365,
      analyticsDataDays: 90,
    };
    this.loadConsent();
  }

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  private async loadConsent(): Promise<void> {
    const stored = await AsyncStorage.getItem('privacyConsent');
    if (stored) {
      this.consent = JSON.parse(stored);
    }
  }

  private async persistConsent(): Promise<void> {
    await AsyncStorage.setItem('privacyConsent', JSON.stringify(this.consent));
  }

  public async updateConsent(settings: Partial<ConsentSettings>): Promise<void> {
    const previousConsent = { ...this.consent };

    this.consent = {
      ...this.consent,
      ...settings,
      lastUpdated: Date.now(),
    };

    await this.persistConsent();

    await this.sessionManager.trackEvent('consent_updated', {
      previousConsent,
      newConsent: this.consent,
    });

    // Handle consent changes
    if (settings.analyticsEnabled === false && previousConsent.analyticsEnabled) {
      await this.handleAnalyticsOptOut();
    }
  }

  private async handleAnalyticsOptOut(): Promise<void> {
    // Clear stored analytics data
    await AsyncStorage.removeItem('sessions');
    await AsyncStorage.removeItem('sessionRetryQueue');

    await this.sessionManager.trackEvent('analytics_opt_out', {
      dataCleared: true,
    });
  }

  public isAnalyticsEnabled(): boolean {
    return this.consent.analyticsEnabled;
  }

  public isSessionReplayEnabled(): boolean {
    return this.consent.sessionReplayEnabled;
  }

  public getConsent(): ConsentSettings {
    return { ...this.consent };
  }

  public async requestDataDeletion(): Promise<void> {
    await this.sessionManager.trackEvent('data_deletion_requested', {});

    // Clear all local data
    const keysToRemove = [
      'sessions',
      'sessionRetryQueue',
      'userIdentity',
      'deviceId',
    ];

    await Promise.all(keysToRemove.map((key) => AsyncStorage.removeItem(key)));

    // Notify backend of deletion request
    try {
      await fetch('https://your-analytics-api.com/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestTime: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to request data deletion:', error);
    }
  }

  public async exportUserData(): Promise<Record<string, unknown>> {
    const sessions = await AsyncStorage.getItem('sessions');
    const identity = await AsyncStorage.getItem('userIdentity');
    const consent = await AsyncStorage.getItem('privacyConsent');

    return {
      sessions: sessions ? JSON.parse(sessions) : [],
      identity: identity ? JSON.parse(identity) : null,
      consent: consent ? JSON.parse(consent) : null,
      exportedAt: Date.now(),
    };
  }

  public sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
    const piiPatterns = [
      /email/i,
      /phone/i,
      /address/i,
      /name/i,
      /ssn/i,
      /password/i,
      /credit/i,
      /card/i,
    ];

    const sanitized: Record<string, unknown> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (piiPatterns.some((pattern) => pattern.test(key))) {
        sanitized[key] = '[PII_REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}

export default PrivacyManager;
```

## Analyzing Session Data

Once you have collected session data, the next step is to analyze it effectively.

### Analytics Service

```typescript
// src/services/AnalyticsService.ts
import SessionManager from './SessionManager';
import FunnelTracker from './FunnelTracker';

interface SessionMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  averageScreensPerSession: number;
  averageEventsPerSession: number;
  bounceRate: number;
  returnRate: number;
}

interface UserEngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionsPerUser: number;
  retentionRate: number;
}

interface ScreenMetrics {
  screenName: string;
  totalViews: number;
  uniqueViews: number;
  averageTimeOnScreen: number;
  exitRate: number;
  bounceRate: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionManager: SessionManager;
  private funnelTracker: FunnelTracker;

  private constructor() {
    this.sessionManager = SessionManager.getInstance();
    this.funnelTracker = FunnelTracker.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async getSessionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SessionMetrics> {
    // Fetch session data from backend
    const response = await fetch(
      `https://your-analytics-api.com/metrics/sessions?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    const data = await response.json();

    return {
      totalSessions: data.totalSessions,
      averageSessionDuration: data.averageSessionDuration,
      averageScreensPerSession: data.averageScreensPerSession,
      averageEventsPerSession: data.averageEventsPerSession,
      bounceRate: data.bounceRate,
      returnRate: data.returnRate,
    };
  }

  public async getEngagementMetrics(): Promise<UserEngagementMetrics> {
    const response = await fetch(
      'https://your-analytics-api.com/metrics/engagement'
    );
    const data = await response.json();

    return {
      dailyActiveUsers: data.dau,
      weeklyActiveUsers: data.wau,
      monthlyActiveUsers: data.mau,
      averageSessionsPerUser: data.avgSessionsPerUser,
      retentionRate: data.retentionRate,
    };
  }

  public async getScreenMetrics(screenName: string): Promise<ScreenMetrics> {
    const response = await fetch(
      `https://your-analytics-api.com/metrics/screens/${screenName}`
    );
    const data = await response.json();

    return {
      screenName,
      totalViews: data.totalViews,
      uniqueViews: data.uniqueViews,
      averageTimeOnScreen: data.avgTime,
      exitRate: data.exitRate,
      bounceRate: data.bounceRate,
    };
  }

  public async getTopScreens(limit: number = 10): Promise<ScreenMetrics[]> {
    const response = await fetch(
      `https://your-analytics-api.com/metrics/screens/top?limit=${limit}`
    );
    return response.json();
  }

  public async getUserFlowData(): Promise<{
    nodes: { id: string; value: number }[];
    links: { source: string; target: string; value: number }[];
  }> {
    const response = await fetch(
      'https://your-analytics-api.com/metrics/user-flow'
    );
    return response.json();
  }

  public getFunnelMetrics(funnelName: string) {
    return this.funnelTracker.getFunnelAnalytics(funnelName);
  }

  public async getDropOffAnalysis(
    funnelName: string
  ): Promise<{
    step: string;
    dropOffRate: number;
    commonReasons: string[];
  }[]> {
    const response = await fetch(
      `https://your-analytics-api.com/metrics/funnels/${funnelName}/dropoff`
    );
    return response.json();
  }
}

export default AnalyticsService;
```

## Optimizing User Journeys

Use the insights from session tracking to improve user experiences.

### Journey Optimization

```typescript
// src/services/JourneyOptimizer.ts
import AnalyticsService from './AnalyticsService';
import FunnelTracker from './FunnelTracker';

interface OptimizationSuggestion {
  area: string;
  issue: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
  metrics: Record<string, number>;
}

interface ABTestConfig {
  testId: string;
  testName: string;
  variants: {
    id: string;
    name: string;
    weight: number;
  }[];
  targetMetric: string;
}

class JourneyOptimizer {
  private static instance: JourneyOptimizer;
  private analyticsService: AnalyticsService;
  private funnelTracker: FunnelTracker;
  private activeTests: Map<string, ABTestConfig> = new Map();

  private constructor() {
    this.analyticsService = AnalyticsService.getInstance();
    this.funnelTracker = FunnelTracker.getInstance();
  }

  public static getInstance(): JourneyOptimizer {
    if (!JourneyOptimizer.instance) {
      JourneyOptimizer.instance = new JourneyOptimizer();
    }
    return JourneyOptimizer.instance;
  }

  public async analyzeAndSuggest(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze funnel drop-offs
    const funnelMetrics = this.funnelTracker.getFunnelAnalytics('purchase_funnel');
    if (funnelMetrics) {
      for (const step of funnelMetrics.stepConversions) {
        if (step.conversionRate < 50) {
          suggestions.push({
            area: 'Funnel',
            issue: `High drop-off at "${step.stepName}" (${step.conversionRate.toFixed(1)}% conversion)`,
            impact: step.conversionRate < 30 ? 'high' : 'medium',
            suggestion: this.getSuggestionForStep(step.stepName),
            metrics: {
              conversionRate: step.conversionRate,
              averageTime: step.averageTime,
            },
          });
        }
      }
    }

    // Analyze screen performance
    const topScreens = await this.analyticsService.getTopScreens(5);
    for (const screen of topScreens) {
      if (screen.bounceRate > 60) {
        suggestions.push({
          area: 'Screen',
          issue: `High bounce rate on "${screen.screenName}" (${screen.bounceRate.toFixed(1)}%)`,
          impact: 'high',
          suggestion: `Review content and UX on ${screen.screenName}. Consider A/B testing alternative layouts.`,
          metrics: {
            bounceRate: screen.bounceRate,
            avgTime: screen.averageTimeOnScreen,
          },
        });
      }
    }

    return suggestions;
  }

  private getSuggestionForStep(stepName: string): string {
    const suggestions: Record<string, string> = {
      checkout_started: 'Consider adding trust signals and simplifying the checkout entry point.',
      payment_entered: 'Offer multiple payment options and ensure form validation is user-friendly.',
      shipping_entered: 'Provide clear shipping cost estimates upfront and offer free shipping thresholds.',
      email_verified: 'Simplify verification process and allow magic links for easier verification.',
      default: 'Review user feedback and session replays to identify friction points.',
    };

    return suggestions[stepName] || suggestions['default'];
  }

  public registerABTest(config: ABTestConfig): void {
    this.activeTests.set(config.testId, config);
  }

  public getVariant(testId: string, userId: string): string | null {
    const test = this.activeTests.get(testId);
    if (!test) return null;

    // Deterministic variant assignment based on userId
    const hash = this.hashString(userId + testId);
    const normalizedHash = hash / 0xffffffff;

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return variant.id;
      }
    }

    return test.variants[0].id;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export default JourneyOptimizer;
```

## Putting It All Together

Here is how to integrate all these services into your React Native application.

### Main App Integration

```typescript
// App.tsx
import React, { useEffect } from 'react';
import { TrackedNavigationContainer } from './src/navigation/NavigationTracker';
import SessionManager from './src/services/SessionManager';
import SessionContextManager from './src/services/SessionContext';
import UserIdentificationService from './src/services/UserIdentification';
import PrivacyManager from './src/services/PrivacyManager';
import SessionReplayService from './src/services/SessionReplay';
import { MainNavigator } from './src/navigation/MainNavigator';

function App() {
  useEffect(() => {
    // Initialize services
    const initializeTracking = async () => {
      const privacyManager = PrivacyManager.getInstance();
      const consent = privacyManager.getConsent();

      if (consent.analyticsEnabled) {
        const sessionManager = SessionManager.getInstance();
        await sessionManager.startNewSession();

        if (consent.sessionReplayEnabled) {
          const replayService = SessionReplayService.getInstance();
          replayService.startRecording();
        }
      }
    };

    initializeTracking();

    return () => {
      // Cleanup on unmount
      SessionManager.getInstance().endSession();
      SessionReplayService.getInstance().stopRecording();
      SessionContextManager.getInstance().cleanup();
    };
  }, []);

  return (
    <TrackedNavigationContainer>
      <MainNavigator />
    </TrackedNavigationContainer>
  );
}

export default App;
```

## Best Practices Summary

When implementing session tracking in your React Native application, keep these best practices in mind:

1. **Start with clear goals**: Define what metrics matter most for your business before implementing tracking.

2. **Respect user privacy**: Always obtain consent before tracking and provide clear opt-out mechanisms.

3. **Minimize data collection**: Only collect data that you will actually use for analysis.

4. **Handle offline scenarios**: Queue events when offline and sync when connectivity returns.

5. **Test thoroughly**: Verify that your tracking works correctly across different devices and scenarios.

6. **Monitor performance**: Ensure tracking does not negatively impact app performance.

7. **Document your implementation**: Maintain clear documentation of what you track and why.

8. **Regular audits**: Periodically review your tracking implementation to ensure accuracy and compliance.

## Conclusion

Implementing comprehensive session and journey tracking in your React Native application provides invaluable insights into user behavior. By following the patterns and practices outlined in this guide, you can build a robust analytics foundation that helps you understand your users better, identify friction points in their journeys, and ultimately create more engaging mobile experiences.

Remember that tracking is just the beginning. The real value comes from analyzing the data you collect and taking action to improve your application based on those insights. Start with the basics, iterate based on what you learn, and continuously refine your approach to user journey optimization.

The code examples provided in this guide offer a solid starting point, but you should adapt them to your specific needs and integrate with your preferred analytics backend. Whether you use a commercial analytics platform or build your own solution, the principles of session tracking, journey mapping, and funnel analysis remain the same.
