# Validation Summary: How to Enable Offline Persistence in Firestore for Web Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Firebase JavaScript SDK
- Firestore Web offline persistence
- IndexedDB persistence cache
- JavaScript

## Sources Consulted
- Firebase documentation: Access data offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firebase JavaScript API reference: PersistentCacheSettings: https://firebase.google.com/docs/reference/js/firestore_.persistentcachesettings
- Firebase JavaScript API reference: SnapshotMetadata: https://firebase.google.com/docs/reference/js/firestore_.snapshotmetadata
- Firebase JavaScript API reference: Firestore Web SDK functions, including setDoc and onSnapshotsInSync: https://firebase.google.com/docs/reference/js/firestore_
- Firebase documentation: Transactions and batched writes: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firebase JavaScript API reference: v8 Firestore and persistence APIs: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Firestore
- Firebase JavaScript API reference: v8 Firestore Settings: https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Settings

## Issues Found
- The article said a Firestore write promise resolves immediately while offline. Firebase's JavaScript API reference says `setDoc()` resolves after the backend acknowledges the write and will not resolve while offline. I changed the example and explanation to state that local listeners update immediately, while the promise resolves after backend acknowledgement.
- The snapshot metadata examples used `fromCache` and `hasPendingWrites` without requesting metadata-only updates. Firebase documentation says listeners should use `includeMetadataChanges` when relying on metadata updates. I added that option to the relevant `onSnapshot` examples.
- The article described `onSnapshotsInSync` as a way to monitor connection state and server sync. Firebase's API reference says it only indicates active listeners are in sync with each other, not with the server. I corrected the heading text, comments, and log message around that example.
- The conflict-resolution note recommended transactions without noting the offline limitation. Firebase documentation says transactions fail when the client is offline. I updated the paragraph to clarify that transactions are useful for online read-modify-write flows but are not a complete offline conflict-resolution strategy by themselves.
- The browser compatibility section said most modern browsers support offline persistence. Firebase documentation states web offline persistence is supported on Chrome, Safari, and Firefox. I tightened that wording.

## Review Notes
The modular v9+ `persistentLocalCache()` and `persistentMultipleTabManager()` examples are consistent with current Firebase documentation. The compat `enablePersistence({ synchronizeTabs: true })` example remains valid for older projects, though new web apps should prefer the modular SDK.
