# Validation Summary: How to Build Custom Widgets in Flutter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flutter SDK
- Dart language
- StatelessWidget / StatefulWidget
- AnimationController, CurvedAnimation, Tween
- AnimatedBuilder, RotationTransition, SizeTransition, AnimatedContainer
- CustomPainter / CustomPaint / Canvas API
- InheritedWidget
- Form / TextField / FormFieldValidator
- ValueNotifier / ValueListenableBuilder
- RepaintBoundary
- Material widgets (Card, ElevatedButton, OutlinedButton, CircleAvatar, InkWell)

## Sources Consulted
- Flutter API documentation — Color class and the `withValues` / `withOpacity` deprecation (Flutter 3.27, December 2024): https://api.flutter.dev/flutter/dart-ui/Color/withValues.html
- Flutter API documentation — CustomPainter: https://api.flutter.dev/flutter/rendering/CustomPainter-class.html
- Flutter API documentation — InheritedWidget and `dependOnInheritedWidgetOfExactType`: https://api.flutter.dev/flutter/widgets/InheritedWidget-class.html
- Flutter API documentation — AnimationController / CurvedAnimation: https://api.flutter.dev/flutter/animation/AnimationController-class.html
- Flutter API documentation — RotationTransition (`turns`) and SizeTransition (`sizeFactor`): https://api.flutter.dev/flutter/widgets/RotationTransition-class.html
- Flutter API documentation — Canvas.drawArc signature: https://api.flutter.dev/flutter/dart-ui/Canvas/drawArc.html
- Dart language tour — super-parameter forwarding (Dart 2.17+): https://dart.dev/language/constructors#super-parameters

## Issues Found
- Replaced four uses of the deprecated `Color.withOpacity(double)` method with the current `Color.withValues(alpha: double)` API. `withOpacity` was deprecated in Flutter 3.27 (December 2024) because it operates in lower-precision sRGB. For a February 2026 post, the modern API is the correct choice. Affected snippets: `GradientButton` shadow color, `_CircularProgressPainter` background paint color, `ExpandableCard` leading-icon background, and `ThemedCard` shadow color.

## Review Notes
- The custom widget defined in the "Custom Painting with CustomPainter" section is named `CircularProgressIndicator`, which is the same name as Flutter's built-in Material widget exported by `package:flutter/material.dart`. Dart allows the local declaration to shadow the imported one within the same library, so the snippet compiles and works as shown, but in production code it is preferable to pick a distinct name (e.g., `CustomCircularProgress`) to avoid shadowing and confusion. Left as-is because the post does not intermix the two.
- In `_CircularProgressPainter.shouldRepaint`, the parameter is narrowed to the concrete subclass without an explicit `covariant` keyword. This is valid because the base `CustomPainter.shouldRepaint` already declares the parameter as `covariant`, so subclasses may further narrow the type. Code is correct.
- `super.key` and `required super.child` rely on Dart super-parameter forwarding (Dart 2.17+), which is supported by all currently supported Flutter SDKs (3.0+). No issue.
- `CurvedAnimation` extends `Animation<double>`, so assigning it to a field typed `Animation<double>` is valid. Same for using it as `RotationTransition.turns` and `SizeTransition.sizeFactor`.
- The `_validate` callback in `CustomTextField` is wired only to `onEditingComplete`. This is a design choice, not an error — validation fires when the user submits the field rather than on every keystroke, and the existing `_onChanged` clears the error as the user types. Worth noting for readers who may expect inline validation.
