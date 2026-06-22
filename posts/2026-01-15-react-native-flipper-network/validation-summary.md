# Validation Summary: How to Debug Network Requests in React Native with Flipper

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React Native
- Flipper
- Flipper Network plugin
- HTTP/HTTPS debugging
- GraphQL over HTTP
- WebSocket debugging
- iOS App Transport Security
- Android Network Security Configuration
- JavaScript Fetch API
- NetInfo

## Sources Consulted
- React Native 0.62 release announcement: https://reactnative.dev/blog/2020/03/26/version-0.62
- React Native 0.73 debugging improvements and Flipper deprecation: https://reactnative.dev/blog/2023/12/06/0.73-debugging-improvements-stable-symlinks
- React Native 0.74 release notes and Flipper removal: https://reactnative.dev/blog/2024/04/22/release-0.74
- React Native Debugging docs: https://reactnative.dev/docs/debugging
- React Native DevTools docs: https://reactnative.dev/docs/react-native-devtools
- Flipper official repository and project page: https://github.com/facebook/flipper
- Homebrew Flipper cask page: https://formulae.brew.sh/cask/flipper
- Android Network Security Configuration docs: https://developer.android.com/privacy-and-security/security-config
- Apple NSAppTransportSecurity documentation: https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity
- React Native NetInfo repository: https://github.com/react-native-netinfo/react-native-netinfo
- MDN AbortController reference: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- Flipper WebSocket inspection issue: https://github.com/facebook/flipper/issues/960

## Issues Found
- The post claimed Flipper was the go-to/default React Native debugging platform for all React Native 0.62+ projects. Updated the introduction, prerequisites, setup, and conclusion to clarify that React Native added Flipper by default in 0.62, deprecated the built-in integration in 0.73, and removed it from new projects in 0.74.
- The setup section showed JavaScript imports for `react-native-flipper` and `flipper-plugin-network` as a way to configure the Network plugin. Removed that inaccurate JS configuration and clarified that network capture is wired through native iOS/Android debug configuration.
- The post implied Flipper automatically captures all HTTP/HTTPS traffic. Narrowed this to traffic flowing through the networking stack configured with the Flipper Network plugin, with custom native clients requiring additional setup.
- The timing section described Chrome DevTools-style DNS, TCP, TLS, TTFB, and download phase timing as if Flipper always exposes it. Reworded it to say Flipper primarily provides request-level timing and that per-phase timing should be investigated with platform logs, server logs, or a proxy.
- The filtering, saved filters, mocking, replay, HAR export, and cURL export sections made version-independent UI claims. Updated these sections to mark those features as Flipper-version or integration dependent.
- The WebSocket section claimed the built-in Flipper Network plugin can inspect WebSocket messages in React Native. Updated it to state that the built-in Network plugin is primarily for HTTP/HTTPS and does not reliably inspect WebSocket frames; recommended application logs, protocol-specific plugins, or WebSocket-capable tools.
- The WebSocket JSON example used comments inside a `json` code block, which is invalid JSON. Split the sent and received examples into separate valid JSON blocks.
- The installation section implied `brew install --cask flipper` is always usable. Added a caveat that the cask may be unavailable or disabled and official releases should be used in that case.

## Review Notes
The corrected guide is now accurate for older React Native projects that still include Flipper and for manually integrated Flipper setups. For new React Native projects, the post should continue to point readers toward React Native DevTools and platform-native network tooling because Flipper's React Native integration is no longer the default path.
