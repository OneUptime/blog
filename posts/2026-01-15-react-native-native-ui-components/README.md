# How to Implement Native UI Components in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, Native UI, ViewManager, iOS, Android, Custom Components, Mobile Development

Description: Learn how to create native UI components in React Native for custom platform-specific views and controls.

---

React Native provides an excellent bridge between JavaScript and native platforms, but there are times when you need to go beyond the built-in components. Whether you need to integrate a third-party native SDK, access platform-specific UI controls, or optimize performance for complex views, creating native UI components is a powerful technique every React Native developer should master.

In this comprehensive guide, we will explore the complete process of implementing native UI components for both iOS and Android, covering everything from basic ViewManager creation to advanced topics like Fabric architecture and performance optimization.

## When to Use Native UI Components

Before diving into implementation details, it is important to understand when native UI components are the right choice:

### Scenarios Requiring Native UI Components

1. **Platform-Specific Controls**: When you need access to platform-specific UI elements like iOS's UIDatePicker or Android's MaterialCalendarView that have no JavaScript equivalent.

2. **Third-Party SDK Integration**: Many SDKs provide native UI components (maps, video players, charts) that need to be wrapped for React Native use.

3. **Performance-Critical Views**: Complex animations, canvas rendering, or high-frequency updates often perform better as native views.

4. **Hardware Integration**: Components that interface with device hardware (camera preview, AR views) typically require native implementation.

5. **Custom Rendering**: When you need to draw custom graphics or implement specialized rendering pipelines.

### When to Avoid Native UI Components

- Simple layouts that can be achieved with existing React Native components
- Cross-platform functionality where JavaScript solutions exist
- Rapid prototyping phases where development speed is prioritized
- When the added complexity outweighs the benefits

## ViewManager Basics

In React Native, native UI components are managed by a ViewManager class. The ViewManager acts as a factory and configuration hub for native views, handling:

- Creating native view instances
- Exposing properties from JavaScript to native
- Handling events from native to JavaScript
- Managing view lifecycle

### Architecture Overview

```
JavaScript Layer          Bridge/JSI           Native Layer
     |                        |                     |
  <MyView                     |                     |
    prop={value}    -------->  Property Update      |
    onEvent={fn}              |              ViewManager
  />                          |                     |
     |                        |               createViewInstance()
     |                        |                     |
     |                 <----  Event Dispatch   NativeView
     |                        |                     |
```

The ViewManager receives property updates from JavaScript, applies them to the native view, and dispatches events back to JavaScript when user interactions occur.

## iOS View Manager Creation

Let us create a native circular progress view for iOS. This example demonstrates the complete workflow for iOS native components.

### Step 1: Create the Native View

First, create the native UIKit view in Objective-C or Swift:

```swift
// CircularProgressView.swift
import UIKit

@objc(CircularProgressView)
class CircularProgressView: UIView {

    private let progressLayer = CAShapeLayer()
    private let backgroundLayer = CAShapeLayer()

    @objc var progress: CGFloat = 0 {
        didSet {
            updateProgress()
        }
    }

    @objc var progressColor: UIColor = .systemBlue {
        didSet {
            progressLayer.strokeColor = progressColor.cgColor
        }
    }

    @objc var trackColor: UIColor = .systemGray5 {
        didSet {
            backgroundLayer.strokeColor = trackColor.cgColor
        }
    }

    @objc var lineWidth: CGFloat = 8 {
        didSet {
            progressLayer.lineWidth = lineWidth
            backgroundLayer.lineWidth = lineWidth
            setNeedsLayout()
        }
    }

    @objc var onProgressChange: RCTBubblingEventBlock?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayers()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayers()
    }

    private func setupLayers() {
        backgroundLayer.fillColor = nil
        backgroundLayer.strokeColor = trackColor.cgColor
        backgroundLayer.lineCap = .round
        layer.addSublayer(backgroundLayer)

        progressLayer.fillColor = nil
        progressLayer.strokeColor = progressColor.cgColor
        progressLayer.lineCap = .round
        progressLayer.strokeEnd = 0
        layer.addSublayer(progressLayer)
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        let center = CGPoint(x: bounds.midX, y: bounds.midY)
        let radius = min(bounds.width, bounds.height) / 2 - lineWidth / 2

        let path = UIBezierPath(
            arcCenter: center,
            radius: radius,
            startAngle: -.pi / 2,
            endAngle: .pi * 1.5,
            clockwise: true
        )

        backgroundLayer.path = path.cgPath
        backgroundLayer.lineWidth = lineWidth

        progressLayer.path = path.cgPath
        progressLayer.lineWidth = lineWidth
    }

    private func updateProgress() {
        CATransaction.begin()
        CATransaction.setAnimationDuration(0.3)
        progressLayer.strokeEnd = progress
        CATransaction.commit()

        // Dispatch event to JavaScript
        onProgressChange?(["progress": progress])
    }
}
```

### Step 2: Create the ViewManager

Now create the ViewManager that bridges the native view to React Native:

```objective-c
// CircularProgressViewManager.m
#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "YourApp-Swift.h"

@interface CircularProgressViewManager : RCTViewManager
@end

@implementation CircularProgressViewManager

RCT_EXPORT_MODULE(CircularProgressView)

- (UIView *)view {
    return [[CircularProgressView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(progress, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(progressColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(trackColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(lineWidth, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(onProgressChange, RCTBubblingEventBlock)

// Custom setter with validation
RCT_CUSTOM_VIEW_PROPERTY(progress, CGFloat, CircularProgressView) {
    CGFloat newProgress = [RCTConvert CGFloat:json];
    view.progress = MAX(0, MIN(1, newProgress)); // Clamp between 0 and 1
}

@end
```

### Step 3: Create the JavaScript Interface

```typescript
// CircularProgressView.tsx
import React from 'react';
import {
  requireNativeComponent,
  ViewStyle,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

interface ProgressChangeEvent {
  progress: number;
}

interface CircularProgressViewProps {
  progress: number;
  progressColor?: string;
  trackColor?: string;
  lineWidth?: number;
  onProgressChange?: (event: NativeSyntheticEvent<ProgressChangeEvent>) => void;
  style?: ViewStyle;
}

const NativeCircularProgressView =
  requireNativeComponent<CircularProgressViewProps>('CircularProgressView');

export const CircularProgressView: React.FC<CircularProgressViewProps> = ({
  progress,
  progressColor = '#007AFF',
  trackColor = '#E5E5EA',
  lineWidth = 8,
  onProgressChange,
  style,
}) => {
  const handleProgressChange = (
    event: NativeSyntheticEvent<ProgressChangeEvent>
  ) => {
    onProgressChange?.(event);
  };

  return (
    <NativeCircularProgressView
      progress={Math.max(0, Math.min(1, progress))}
      progressColor={progressColor}
      trackColor={trackColor}
      lineWidth={lineWidth}
      onProgressChange={handleProgressChange}
      style={[styles.default, style]}
    />
  );
};

const styles = StyleSheet.create({
  default: {
    width: 100,
    height: 100,
  },
});
```

## Android View Manager Creation

Now let us implement the same circular progress view for Android.

### Step 1: Create the Native View

```kotlin
// CircularProgressView.kt
package com.yourapp.views

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

class CircularProgressView(context: Context) : View(context) {

    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }

    private val rectF = RectF()
    private var animator: ValueAnimator? = null
    private var currentProgress = 0f

    var progress: Float = 0f
        set(value) {
            field = value.coerceIn(0f, 1f)
            animateProgress(field)
        }

    var progressColor: Int = 0xFF007AFF.toInt()
        set(value) {
            field = value
            progressPaint.color = value
            invalidate()
        }

    var trackColor: Int = 0xFFE5E5EA.toInt()
        set(value) {
            field = value
            backgroundPaint.color = value
            invalidate()
        }

    var lineWidth: Float = 8f * resources.displayMetrics.density
        set(value) {
            field = value
            backgroundPaint.strokeWidth = value
            progressPaint.strokeWidth = value
            invalidate()
        }

    init {
        backgroundPaint.color = trackColor
        backgroundPaint.strokeWidth = lineWidth
        progressPaint.color = progressColor
        progressPaint.strokeWidth = lineWidth
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val padding = lineWidth / 2
        rectF.set(
            padding,
            padding,
            width - padding,
            height - padding
        )

        // Draw background track
        canvas.drawArc(rectF, -90f, 360f, false, backgroundPaint)

        // Draw progress arc
        val sweepAngle = currentProgress * 360f
        canvas.drawArc(rectF, -90f, sweepAngle, false, progressPaint)
    }

    private fun animateProgress(targetProgress: Float) {
        animator?.cancel()
        animator = ValueAnimator.ofFloat(currentProgress, targetProgress).apply {
            duration = 300
            addUpdateListener { animation ->
                currentProgress = animation.animatedValue as Float
                invalidate()
            }
            start()
        }

        // Dispatch event to JavaScript
        dispatchProgressChange(targetProgress)
    }

    private fun dispatchProgressChange(progress: Float) {
        val reactContext = context as? ReactContext ?: return
        val event = Arguments.createMap().apply {
            putDouble("progress", progress.toDouble())
        }

        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onProgressChange", event)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        animator?.cancel()
    }
}
```

### Step 2: Create the ViewManager

```kotlin
// CircularProgressViewManager.kt
package com.yourapp.views

import android.graphics.Color
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class CircularProgressViewManager : SimpleViewManager<CircularProgressView>() {

    override fun getName(): String = "CircularProgressView"

    override fun createViewInstance(
        reactContext: ThemedReactContext
    ): CircularProgressView {
        return CircularProgressView(reactContext)
    }

    @ReactProp(name = "progress")
    fun setProgress(view: CircularProgressView, progress: Float) {
        view.progress = progress
    }

    @ReactProp(name = "progressColor", customType = "Color")
    fun setProgressColor(view: CircularProgressView, color: Int?) {
        view.progressColor = color ?: Color.parseColor("#007AFF")
    }

    @ReactProp(name = "trackColor", customType = "Color")
    fun setTrackColor(view: CircularProgressView, color: Int?) {
        view.trackColor = color ?: Color.parseColor("#E5E5EA")
    }

    @ReactProp(name = "lineWidth")
    fun setLineWidth(view: CircularProgressView, lineWidth: Float) {
        val density = view.resources.displayMetrics.density
        view.lineWidth = lineWidth * density
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put(
                "onProgressChange",
                MapBuilder.of("registrationName", "onProgressChange")
            )
            .build()
    }

    // Support for direct manipulation commands
    override fun getCommandsMap(): Map<String, Int>? {
        return MapBuilder.of(
            "setProgressAnimated", COMMAND_SET_PROGRESS_ANIMATED,
            "reset", COMMAND_RESET
        )
    }

    override fun receiveCommand(
        view: CircularProgressView,
        commandId: Int,
        args: ReadableArray?
    ) {
        when (commandId) {
            COMMAND_SET_PROGRESS_ANIMATED -> {
                val progress = args?.getDouble(0)?.toFloat() ?: return
                view.progress = progress
            }
            COMMAND_RESET -> {
                view.progress = 0f
            }
        }
    }

    companion object {
        private const val COMMAND_SET_PROGRESS_ANIMATED = 1
        private const val COMMAND_RESET = 2
    }
}
```

### Step 3: Register the ViewManager

```kotlin
// CircularProgressViewPackage.kt
package com.yourapp.views

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CircularProgressViewPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return listOf(CircularProgressViewManager())
    }
}
```

Register the package in your MainApplication:

```kotlin
// MainApplication.kt
override fun getPackages(): List<ReactPackage> {
    val packages = PackageList(this).packages.toMutableList()
    packages.add(CircularProgressViewPackage())
    return packages
}
```

## Exposing View Properties

Properties are the primary way to configure native views from JavaScript. React Native provides several macros and annotations for this purpose.

### iOS Property Types

```objective-c
// Basic types
RCT_EXPORT_VIEW_PROPERTY(enabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(count, NSInteger)
RCT_EXPORT_VIEW_PROPERTY(value, CGFloat)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)

// Colors and images
RCT_EXPORT_VIEW_PROPERTY(tintColor, UIColor)
RCT_EXPORT_VIEW_PROPERTY(backgroundImage, UIImage)

// Enums with custom converter
RCT_EXPORT_VIEW_PROPERTY(alignment, NSTextAlignment)

// Custom property handling
RCT_CUSTOM_VIEW_PROPERTY(borderRadius, CGFloat, MyCustomView) {
    if (json) {
        view.layer.cornerRadius = [RCTConvert CGFloat:json];
        view.layer.masksToBounds = YES;
    } else {
        view.layer.cornerRadius = defaultView.layer.cornerRadius;
    }
}

// Array properties
RCT_EXPORT_VIEW_PROPERTY(items, NSArray)

// Dictionary properties
RCT_EXPORT_VIEW_PROPERTY(config, NSDictionary)
```

### Android Property Types

```kotlin
// Basic types
@ReactProp(name = "enabled")
fun setEnabled(view: MyView, enabled: Boolean) {}

@ReactProp(name = "count")
fun setCount(view: MyView, count: Int) {}

@ReactProp(name = "value")
fun setValue(view: MyView, value: Float) {}

@ReactProp(name = "title")
fun setTitle(view: MyView, title: String?) {}

// Colors
@ReactProp(name = "tintColor", customType = "Color")
fun setTintColor(view: MyView, color: Int?) {}

// Default values
@ReactProp(name = "opacity", defaultFloat = 1f)
fun setOpacity(view: MyView, opacity: Float) {}

// Grouped properties (e.g., for border)
@ReactPropGroup(
    names = ["borderRadius", "borderTopLeftRadius", "borderTopRightRadius",
             "borderBottomLeftRadius", "borderBottomRightRadius"],
    defaultFloat = Float.NaN
)
fun setBorderRadius(view: MyView, index: Int, borderRadius: Float) {}
```

## Handling Events from Native

Events allow native views to communicate back to JavaScript. Both platforms support different event types.

### iOS Event Types

```objective-c
// Bubbling events (propagate up the view hierarchy)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)

// Direct events (sent directly to the target component)
RCT_EXPORT_VIEW_PROPERTY(onLoadStart, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadEnd, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)
```

Dispatching events from native:

```swift
// In your native view
@objc var onImageLoaded: RCTDirectEventBlock?

func imageDidLoad(size: CGSize) {
    onImageLoaded?([
        "width": size.width,
        "height": size.height,
        "timestamp": Date().timeIntervalSince1970
    ])
}
```

### Android Event Registration

```kotlin
override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any>? {
    return MapBuilder.builder<String, Any>()
        .put(
            "topPress",
            MapBuilder.of(
                "phasedRegistrationNames",
                MapBuilder.of(
                    "bubbled", "onPress",
                    "captured", "onPressCapture"
                )
            )
        )
        .build()
}

override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
    return MapBuilder.builder<String, Any>()
        .put(
            "onImageLoaded",
            MapBuilder.of("registrationName", "onImageLoaded")
        )
        .put(
            "onError",
            MapBuilder.of("registrationName", "onError")
        )
        .build()
}
```

## Direct Manipulation

Direct manipulation allows you to call methods on native views without triggering a full re-render. This is useful for animations and time-sensitive operations.

### iOS Commands

```objective-c
// ViewManager.m
#import <React/RCTUIManager.h>

RCT_EXPORT_METHOD(scrollToTop:(nonnull NSNumber *)reactTag animated:(BOOL)animated) {
    [self.bridge.uiManager addUIBlock:^(
        RCTUIManager *uiManager,
        NSDictionary<NSNumber *, UIView *> *viewRegistry
    ) {
        MyScrollView *view = (MyScrollView *)viewRegistry[reactTag];
        if ([view isKindOfClass:[MyScrollView class]]) {
            [view scrollToTopAnimated:animated];
        }
    }];
}

RCT_EXPORT_METHOD(setNativeProgress:(nonnull NSNumber *)reactTag
                  progress:(CGFloat)progress
                  animated:(BOOL)animated) {
    [self.bridge.uiManager addUIBlock:^(
        RCTUIManager *uiManager,
        NSDictionary<NSNumber *, UIView *> *viewRegistry
    ) {
        CircularProgressView *view =
            (CircularProgressView *)viewRegistry[reactTag];
        if ([view isKindOfClass:[CircularProgressView class]]) {
            [view setProgress:progress animated:animated];
        }
    }];
}
```

### JavaScript Command Interface

```typescript
// CircularProgressViewCommands.ts
import { UIManager, findNodeHandle } from 'react-native';

type CircularProgressViewRef = React.Component<any> | null;

export const CircularProgressViewCommands = {
  setProgressAnimated: (
    ref: CircularProgressViewRef,
    progress: number,
    animated: boolean = true
  ) => {
    const handle = findNodeHandle(ref);
    if (handle != null) {
      UIManager.dispatchViewManagerCommand(
        handle,
        UIManager.getViewManagerConfig('CircularProgressView').Commands
          .setProgressAnimated,
        [progress, animated]
      );
    }
  },

  reset: (ref: CircularProgressViewRef) => {
    const handle = findNodeHandle(ref);
    if (handle != null) {
      UIManager.dispatchViewManagerCommand(
        handle,
        UIManager.getViewManagerConfig('CircularProgressView').Commands.reset,
        []
      );
    }
  },
};

// Usage in a component
const progressRef = useRef(null);

const handleAnimate = () => {
  CircularProgressViewCommands.setProgressAnimated(progressRef.current, 0.75, true);
};

return <CircularProgressView ref={progressRef} />;
```

## Measuring Native Views

Sometimes you need to measure native views for layout calculations or animations.

### Using UIManager.measure

```typescript
import { UIManager, findNodeHandle } from 'react-native';

const measureView = (ref: React.RefObject<any>) => {
  const handle = findNodeHandle(ref.current);
  if (handle) {
    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      console.log('View measurements:', {
        x,      // X position relative to parent
        y,      // Y position relative to parent
        width,  // View width
        height, // View height
        pageX,  // X position on screen
        pageY,  // Y position on screen
      });
    });
  }
};
```

### Native View Measurement Implementation

```swift
// iOS - Implementing custom measurement
@objc func getContentSize() -> CGSize {
    return contentView.intrinsicContentSize
}
```

```kotlin
// Android - Custom measurement
fun measureContent(): IntArray {
    measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
    )
    return intArrayOf(measuredWidth, measuredHeight)
}
```

## Shadow Nodes

Shadow nodes are essential for views that need custom layout calculations. They run on the layout thread and compute view dimensions before the main thread renders.

### iOS Shadow View

```objective-c
// CircularProgressShadowView.h
#import <React/RCTShadowView.h>

@interface CircularProgressShadowView : RCTShadowView

@property (nonatomic, assign) CGFloat aspectRatio;

@end

// CircularProgressShadowView.m
#import "CircularProgressShadowView.h"
#import <yoga/Yoga.h>

@implementation CircularProgressShadowView

- (instancetype)init {
    self = [super init];
    if (self) {
        _aspectRatio = 1.0; // Square by default
        YGNodeSetMeasureFunc(self.yogaNode, CircularProgressMeasure);
    }
    return self;
}

static YGSize CircularProgressMeasure(
    YGNodeRef node,
    float width,
    YGMeasureMode widthMode,
    float height,
    YGMeasureMode heightMode
) {
    CircularProgressShadowView *shadowView =
        (__bridge CircularProgressShadowView *)YGNodeGetContext(node);

    CGFloat size;
    if (widthMode == YGMeasureModeExactly) {
        size = width;
    } else if (heightMode == YGMeasureModeExactly) {
        size = height;
    } else {
        size = 100; // Default size
    }

    return (YGSize){
        .width = size,
        .height = size * shadowView.aspectRatio
    };
}

@end

// In ViewManager
- (RCTShadowView *)shadowView {
    return [CircularProgressShadowView new];
}
```

### Android Shadow Node

```kotlin
// CircularProgressShadowNode.kt
package com.yourapp.views

import com.facebook.react.uimanager.LayoutShadowNode
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.yoga.YogaMeasureFunction
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput
import com.facebook.yoga.YogaNode

class CircularProgressShadowNode : LayoutShadowNode(), YogaMeasureFunction {

    private var aspectRatio = 1f

    init {
        setMeasureFunction(this)
    }

    @ReactProp(name = "aspectRatio", defaultFloat = 1f)
    fun setAspectRatio(ratio: Float) {
        aspectRatio = ratio
        dirty()
    }

    override fun measure(
        node: YogaNode,
        width: Float,
        widthMode: YogaMeasureMode,
        height: Float,
        heightMode: YogaMeasureMode
    ): Long {
        val size = when {
            widthMode == YogaMeasureMode.EXACTLY -> width
            heightMode == YogaMeasureMode.EXACTLY -> height
            else -> 100f * themedContext.resources.displayMetrics.density
        }

        return YogaMeasureOutput.make(size, size * aspectRatio)
    }
}

// In ViewManager
override fun getShadowNodeClass(): Class<out LayoutShadowNode> {
    return CircularProgressShadowNode::class.java
}

override fun createShadowNodeInstance(): LayoutShadowNode {
    return CircularProgressShadowNode()
}
```

## Fabric Architecture Overview

Fabric is React Native's new rendering system that provides significant improvements over the legacy architecture.

### Key Differences from Legacy Architecture

| Aspect | Legacy | Fabric |
|--------|--------|--------|
| Threading | Async bridge | Synchronous JSI |
| Communication | JSON serialization | Direct C++ calls |
| View Updates | Batched | Immediate |
| Memory | High overhead | Optimized |

### Implementing Fabric Components

```cpp
// CircularProgressViewComponentDescriptor.h
#pragma once

#include <react/renderer/components/rncore/Props.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

class CircularProgressViewProps : public ViewProps {
public:
    CircularProgressViewProps() = default;
    CircularProgressViewProps(
        const PropsParserContext& context,
        const CircularProgressViewProps& sourceProps,
        const RawProps& rawProps
    );

    float progress{0.0f};
    SharedColor progressColor{};
    SharedColor trackColor{};
    float lineWidth{8.0f};
};

class CircularProgressViewEventEmitter : public ViewEventEmitter {
public:
    using ViewEventEmitter::ViewEventEmitter;

    void onProgressChange(float progress) const;
};

using CircularProgressViewComponentDescriptor =
    ConcreteComponentDescriptor<CircularProgressViewShadowNode>;

} // namespace facebook::react
```

### iOS Fabric Implementation

```objective-c
// CircularProgressViewComponentView.mm
#import "CircularProgressViewComponentView.h"
#import <react/renderer/components/rncore/ComponentDescriptors.h>
#import <react/renderer/components/rncore/Props.h>

using namespace facebook::react;

@implementation CircularProgressViewComponentView {
    CircularProgressView *_view;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
    return concreteComponentDescriptorProvider<
        CircularProgressViewComponentDescriptor
    >();
}

- (instancetype)initWithFrame:(CGRect)frame {
    if (self = [super initWithFrame:frame]) {
        _view = [[CircularProgressView alloc] initWithFrame:frame];
        self.contentView = _view;
    }
    return self;
}

- (void)updateProps:(const Props::Shared&)props
           oldProps:(const Props::Shared&)oldProps {
    const auto &oldViewProps =
        *std::static_pointer_cast<const CircularProgressViewProps>(
            _props ?: std::make_shared<const CircularProgressViewProps>()
        );
    const auto &newViewProps =
        *std::static_pointer_cast<const CircularProgressViewProps>(props);

    if (oldViewProps.progress != newViewProps.progress) {
        _view.progress = newViewProps.progress;
    }

    if (oldViewProps.lineWidth != newViewProps.lineWidth) {
        _view.lineWidth = newViewProps.lineWidth;
    }

    [super updateProps:props oldProps:oldProps];
}

@end
```

## Performance Considerations

Optimizing native UI components is crucial for maintaining smooth 60fps performance.

### Minimize Bridge Traffic

```typescript
// Bad: Multiple individual property updates
setProgressColor('#FF0000');
setProgress(0.5);
setLineWidth(10);

// Good: Batch updates in a single render
<CircularProgressView
  progressColor="#FF0000"
  progress={0.5}
  lineWidth={10}
/>
```

### Use Direct Manipulation for Animations

```typescript
// For continuous animations, use direct manipulation
const animateProgress = useCallback(() => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 0.01;
    if (progress >= 1) {
      clearInterval(interval);
      return;
    }
    // Direct manipulation avoids React re-renders
    CircularProgressViewCommands.setProgressAnimated(
      viewRef.current,
      progress,
      false
    );
  }, 16);
}, []);
```

### Optimize Native Drawing

```kotlin
// Android: Avoid allocations in onDraw
class OptimizedView(context: Context) : View(context) {
    // Pre-allocate objects
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rect = RectF()
    private val path = Path()

    override fun onDraw(canvas: Canvas) {
        // Reuse pre-allocated objects
        rect.set(0f, 0f, width.toFloat(), height.toFloat())
        canvas.drawRect(rect, paint)
    }
}
```

```swift
// iOS: Use layer-based animations
class OptimizedView: UIView {
    override class var layerClass: AnyClass {
        return CAShapeLayer.self
    }

    private var shapeLayer: CAShapeLayer {
        return layer as! CAShapeLayer
    }

    func animateProgress(_ progress: CGFloat) {
        // GPU-accelerated animation
        let animation = CABasicAnimation(keyPath: "strokeEnd")
        animation.fromValue = shapeLayer.strokeEnd
        animation.toValue = progress
        animation.duration = 0.3
        shapeLayer.add(animation, forKey: "progress")
        shapeLayer.strokeEnd = progress
    }
}
```

### Memory Management

```kotlin
// Android: Proper cleanup
override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    animator?.cancel()
    bitmap?.recycle()
    disposables.clear()
}
```

```swift
// iOS: Avoid retain cycles
class NativeView: UIView {
    weak var delegate: NativeViewDelegate?

    private var observation: NSKeyValueObservation?

    deinit {
        observation?.invalidate()
    }
}
```

## Testing Native Components

Testing native UI components requires both unit tests and integration tests.

### iOS Unit Tests

```swift
// CircularProgressViewTests.swift
import XCTest
@testable import YourApp

class CircularProgressViewTests: XCTestCase {

    var sut: CircularProgressView!

    override func setUp() {
        super.setUp()
        sut = CircularProgressView(frame: CGRect(x: 0, y: 0, width: 100, height: 100))
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    func testProgressClamping() {
        sut.progress = 1.5
        XCTAssertEqual(sut.progress, 1.0)

        sut.progress = -0.5
        XCTAssertEqual(sut.progress, 0.0)
    }

    func testProgressEventDispatched() {
        var receivedProgress: CGFloat?

        sut.onProgressChange = { event in
            receivedProgress = event["progress"] as? CGFloat
        }

        sut.progress = 0.5

        XCTAssertEqual(receivedProgress, 0.5)
    }

    func testColorUpdates() {
        let expectedColor = UIColor.red
        sut.progressColor = expectedColor

        // Access the layer and verify color
        let progressLayer = sut.layer.sublayers?.last as? CAShapeLayer
        XCTAssertEqual(progressLayer?.strokeColor, expectedColor.cgColor)
    }
}
```

### Android Unit Tests

```kotlin
// CircularProgressViewTest.kt
package com.yourapp.views

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.test.assertEquals

@RunWith(RobolectricTestRunner::class)
class CircularProgressViewTest {

    private lateinit var context: Context
    private lateinit var view: CircularProgressView

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        view = CircularProgressView(context)
    }

    @Test
    fun `progress is clamped between 0 and 1`() {
        view.progress = 1.5f
        assertEquals(1f, view.progress)

        view.progress = -0.5f
        assertEquals(0f, view.progress)
    }

    @Test
    fun `color properties update correctly`() {
        val expectedColor = 0xFFFF0000.toInt()
        view.progressColor = expectedColor
        assertEquals(expectedColor, view.progressColor)
    }
}
```

### Integration Tests with Detox

```typescript
// CircularProgressView.e2e.ts
import { by, device, element, expect } from 'detox';

describe('CircularProgressView', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should render with initial progress', async () => {
    await expect(element(by.id('progress-view'))).toBeVisible();
  });

  it('should update progress when button pressed', async () => {
    await element(by.id('increase-button')).tap();

    // Verify the native component updated
    await expect(element(by.id('progress-view'))).toHaveLabel('Progress: 50%');
  });

  it('should handle rapid progress updates', async () => {
    for (let i = 0; i < 10; i++) {
      await element(by.id('increase-button')).tap();
    }

    // App should not crash and progress should be at 100%
    await expect(element(by.id('progress-view'))).toHaveLabel('Progress: 100%');
  });
});
```

### Snapshot Testing

```typescript
// CircularProgressView.test.tsx
import React from 'react';
import { create } from 'react-test-renderer';
import { CircularProgressView } from '../CircularProgressView';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.UIManager.getViewManagerConfig = jest.fn(() => ({
    Commands: {},
  }));
  return RN;
});

describe('CircularProgressView', () => {
  it('renders correctly with default props', () => {
    const tree = create(<CircularProgressView progress={0.5} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom colors', () => {
    const tree = create(
      <CircularProgressView
        progress={0.75}
        progressColor="#FF0000"
        trackColor="#CCCCCC"
      />
    );
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
```

## Conclusion

Implementing native UI components in React Native opens up a world of possibilities for creating high-performance, platform-specific experiences. While the initial setup requires more effort than using pure JavaScript components, the benefits in terms of performance, platform integration, and access to native capabilities make it worthwhile for many use cases.

Key takeaways from this guide:

1. **Choose wisely**: Only use native components when JavaScript alternatives are insufficient
2. **Master ViewManagers**: They are the foundation of native component integration
3. **Handle both platforms**: iOS and Android have different patterns, but the concepts are similar
4. **Optimize for performance**: Use direct manipulation, minimize bridge traffic, and optimize native drawing
5. **Embrace Fabric**: The new architecture provides significant improvements for native component integration
6. **Test thoroughly**: Native components require testing at multiple levels

As React Native continues to evolve with Fabric and the New Architecture, the line between JavaScript and native performance continues to blur. However, understanding native component implementation remains a valuable skill that enables you to push the boundaries of what is possible in cross-platform mobile development.

## Additional Resources

- [React Native Documentation - Native UI Components](https://reactnative.dev/docs/native-components-ios)
- [React Native New Architecture Guide](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Fabric Renderer](https://reactnative.dev/architecture/fabric-renderer)
- [React Native GitHub Repository](https://github.com/facebook/react-native)
