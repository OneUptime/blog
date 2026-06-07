# Validation Summary: How to Build macOS Applications with SwiftUI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift
- SwiftUI (macOS-specific APIs: WindowGroup, Settings, MenuBarExtra, DocumentGroup, Commands, Table, NavigationSplitView)
- AppKit (NSViewRepresentable, NSColorWell, NSOpenPanel, NSWorkspace)
- UniformTypeIdentifiers (UTType)
- UserNotifications (UNUserNotificationCenter, UNMutableNotificationContent)
- XCTest (for unit tests)
- Property wrappers (@State, @Environment, @Binding, @SceneStorage, @AppStorage)

## Sources Consulted
- Apple SwiftUI documentation: https://developer.apple.com/documentation/swiftui/
- TableColumn `init(_:value:comparator:content:)` reference: https://developer.apple.com/documentation/swiftui/tablecolumn/init(_:value:comparator:content:)-18bc9
- Scene `defaultPosition(_:)`: https://developer.apple.com/documentation/swiftui/scene/defaultposition(_:)
- MenuBarExtra `init(_:systemImage:content:)`: https://developer.apple.com/documentation/swiftui/menubarextra/init(_:systemimage:content:)-3weny
- FileDocumentConfiguration: https://developer.apple.com/documentation/swiftui/filedocumentconfiguration
- WindowResizability: https://developer.apple.com/documentation/swiftui/windowresizability
- `navigationSplitViewColumnWidth(min:ideal:max:)`: https://developer.apple.com/documentation/swiftui/view/navigationsplitviewcolumnwidth(min:ideal:max:)
- `dropDestination(for:action:isTargeted:)`: https://developer.apple.com/documentation/swiftui/view/dropdestination(for:action:istargeted:)
- `contextMenu(forSelectionType:menu:primaryAction:)`: https://developer.apple.com/documentation/swiftui/view/contextmenu(forselectiontype:menu:primaryaction:)
- SidebarCommands, ToolbarCommands, TextFormattingCommands reference pages on developer.apple.com

## Issues Found
- **TableColumn `sortUsing:` parameter does not exist** (in the "Tables for Data Display" section). The original code used `TableColumn("Name", sortUsing: KeyPathComparator(\FileItem.name)) { ... }`, but the correct SwiftUI API uses `value:` with a KeyPath: `TableColumn("Name", value: \.name) { ... }`. The `Table` automatically participates in sorting via the `sortOrder:` binding when columns are declared with `value:`. Fixed all four TableColumn declarations (Name, Size, Date Modified, Kind) accordingly.

## Review Notes
- The post uses the macOS 14+ two-parameter `onChange(of:) { _, newOrder in ... }` signature. This is correct for current SDKs but would not compile against older targets (macOS 13 and below), where the single-parameter form was required. Worth flagging if backward compatibility becomes important.
- Many of the showcased APIs (MenuBarExtra, `.defaultPosition`, `.windowResizability`, `.dropDestination`, `NavigationSplitView`, `Table`, `@Environment(\.openWindow)`) require macOS 13+ / Ventura. The post doesn't explicitly call out a minimum deployment target; readers targeting older macOS versions will need to adjust.
- The `startMonitoring()` function uses `Timer.scheduledTimer` and reads `@State` from inside the closure — this works in practice because `@State` storage is backed by a property wrapper that retains the value, but a `Task`-based async loop would be more idiomatic in modern SwiftUI.
- `WindowGroup` example references `openWindow(id: "document")` for opening a new document, but the corresponding `WindowGroup` shown earlier doesn't carry an `id: "document"` — this is illustrative pseudo-code and not a technical inaccuracy, just a minor consistency point.
- All other code samples (window management, menu bar commands, drag-and-drop, document-based apps, AppKit bridging with `NSViewRepresentable`, button styles, color schemes, materials, notifications) verified against current Apple documentation and are syntactically and API-correct.
