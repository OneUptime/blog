# Validation Summary: How to Choose Between Context API, Redux, and Zustand for Your React App

## Status
validated

## Post Type
Guide / Comparison (architectural decision guide with code examples)

## Technologies Covered
- React (Context API, hooks)
- Redux & Redux Toolkit (RTK), including `createSlice`, `createAsyncThunk`, `configureStore`, RTK Query
- react-redux (typed hooks via `withTypes`)
- Zustand (core `create`, plus `persist`, `devtools`, `immer`, and slices patterns)
- TypeScript
- Testing Library / Jest patterns

## Sources Consulted
- React Redux TypeScript Quick Start (typed hooks) — https://react-redux.js.org/tutorials/typescript-quick-start (confirmed `useDispatch.withTypes<AppDispatch>()` / `useSelector.withTypes<RootState>()` is the current recommended pattern in react-redux v9)
- Redux Toolkit documentation — https://redux-toolkit.js.org/ (createSlice, createAsyncThunk, extraReducers builder callback, configureStore, RTK Query)
- Zustand documentation — https://zustand.docs.pmnd.rs/ and pmndrs GitHub org (create curried signature, persist + createJSONStorage + partialize, immer middleware path, devtools options, maintained by the pmndrs/Poimandres collective)
- React docs on Context — https://react.dev/reference/react/useContext

## Issues Found
No technical issues found.

The code examples use current, non-deprecated APIs:
- The react-redux typed hooks use the modern `withTypes` helpers (v9), not the older manual `TypedUseSelectorHook` cast.
- Redux Toolkit slices, `createAsyncThunk`, and the `extraReducers` builder-callback form are all current (the deprecated object form is not used).
- Zustand's curried `create<T>()(...)` syntax (required for correct TypeScript inference) is used correctly, along with valid `persist`, `devtools` (`enabled`/`name`), and `immer` (`zustand/middleware/immer`) middleware usage.
- The attribution of Zustand to "the team behind React Spring and Jotai" (the pmndrs/Poimandres collective) is accurate.
- "Context API introduced in React 16.3" is correct.

## Review Notes
- Bundle-size figures (~1KB Zustand, ~10KB RTK, 0KB Context) are approximate but consistent with commonly advertised numbers; exact gzipped sizes vary slightly by version and what is imported. These are presented as ballpark comparisons, which is appropriate.
- The decision-framework recommendations (app-size thresholds, learning-time estimates, team-scalability ratings) are opinion/heuristic rather than hard facts — reasonable and clearly framed as guidance.
- The Zustand `fetchUser` example destructures `get` in the store creator but does not use it; harmless and common in illustrative examples.
- No version pin is given for the libraries; the examples target current major versions (Redux Toolkit 2.x / react-redux 9.x, Zustand 4.x–5.x). Worth keeping an eye on if these libraries introduce breaking API changes in the future, but all shown APIs are current as of the review date.
