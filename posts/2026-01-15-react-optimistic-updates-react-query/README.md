# How to Implement Optimistic Updates in React with React Query

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React, React Query, Optimistic Updates, UX, Performance, Data Fetching

Description: Learn how to implement optimistic updates in React applications using React Query to create snappy, responsive user interfaces with proper rollback handling.

---

Modern web applications need to feel instant. Users expect immediate feedback when they click buttons, submit forms, or interact with data. Optimistic updates are a technique where the UI updates immediately before the server confirms the change, creating the perception of instant responsiveness.

React Query (now TanStack Query) provides excellent built-in support for optimistic updates, making it straightforward to implement this pattern while handling the complexity of rollbacks when things go wrong.

## Understanding Optimistic Updates

### The Traditional Approach vs Optimistic Updates

In the traditional approach, the flow looks like this:

1. User clicks a button
2. Loading spinner appears
3. Request sent to server
4. Wait for response (200-2000ms)
5. UI updates with new data

With optimistic updates:

1. User clicks a button
2. UI updates immediately
3. Request sent to server in background
4. If successful, keep the update
5. If failed, rollback to previous state

The difference in perceived performance is significant. Users perceive applications with optimistic updates as 2-3x faster than those without.

### When to Use Optimistic Updates

Optimistic updates work best when:

- The action has a high success rate (95%+)
- The server response time is noticeable (>100ms)
- The action is easily reversible
- User feedback is important

Avoid optimistic updates when:

- The action has significant side effects
- Failure is common or expected
- The action cannot be easily reversed
- Data integrity is critical

## Setting Up React Query

### Installation

```bash
npm install @tanstack/react-query
```

### Basic Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Basic Optimistic Update Pattern

### Simple Toggle Example

Let's start with a simple like button that toggles between liked and unliked states.

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Post {
  id: string;
  title: string;
  liked: boolean;
  likeCount: number;
}

// API functions
async function fetchPost(id: string): Promise<Post> {
  const response = await fetch(`/api/posts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch post');
  return response.json();
}

async function toggleLike(postId: string): Promise<Post> {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  return response.json();
}

function LikeButton({ postId }: { postId: string }) {
  const queryClient = useQueryClient();

  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
  });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId),

    // Called before mutation function
    onMutate: async () => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      // Snapshot the previous value
      const previousPost = queryClient.getQueryData<Post>(['post', postId]);

      // Optimistically update to the new value
      queryClient.setQueryData<Post>(['post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          liked: !old.liked,
          likeCount: old.liked ? old.likeCount - 1 : old.likeCount + 1,
        };
      });

      // Return context with the previous value
      return { previousPost };
    },

    // Called if mutation fails
    onError: (err, variables, context) => {
      // Rollback to the previous value
      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }
    },

    // Called after mutation succeeds or fails
    onSettled: () => {
      // Invalidate and refetch to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });

  if (!post) return null;

  return (
    <button
      onClick={() => likeMutation.mutate()}
      disabled={likeMutation.isPending}
      className={post.liked ? 'liked' : ''}
    >
      {post.liked ? 'Unlike' : 'Like'} ({post.likeCount})
    </button>
  );
}
```

### Understanding the Flow

The `onMutate` callback is the key to optimistic updates:

1. **Cancel queries**: Prevents any in-flight queries from overwriting our optimistic update
2. **Snapshot previous state**: Store the current state so we can rollback if needed
3. **Update cache**: Apply the optimistic update immediately
4. **Return context**: Pass the previous state to error handler for rollback

## Advanced Optimistic Update Patterns

### Updating Lists

Updating items in a list requires careful handling to update both the list and individual item caches.

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface UpdateTodoInput {
  id: string;
  completed: boolean;
}

async function updateTodo(input: UpdateTodoInput): Promise<Todo> {
  const response = await fetch(`/api/todos/${input.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: input.completed }),
  });
  if (!response.ok) throw new Error('Failed to update todo');
  return response.json();
}

function useTodoToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTodo,

    onMutate: async (updatedTodo) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      await queryClient.cancelQueries({ queryKey: ['todo', updatedTodo.id] });

      // Snapshot previous values
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      const previousTodo = queryClient.getQueryData<Todo>(['todo', updatedTodo.id]);

      // Optimistically update the list
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return old;
        return old.map((todo) =>
          todo.id === updatedTodo.id
            ? { ...todo, completed: updatedTodo.completed }
            : todo
        );
      });

      // Optimistically update the individual item
      queryClient.setQueryData<Todo>(['todo', updatedTodo.id], (old) => {
        if (!old) return old;
        return { ...old, completed: updatedTodo.completed };
      });

      return { previousTodos, previousTodo };
    },

    onError: (err, updatedTodo, context) => {
      // Rollback both caches
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      if (context?.previousTodo) {
        queryClient.setQueryData(['todo', updatedTodo.id], context.previousTodo);
      }
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['todo', variables.id] });
    },
  });
}
```

### Adding Items to a List

Adding new items optimistically requires generating temporary IDs.

```typescript
import { v4 as uuidv4 } from 'uuid';

interface CreateTodoInput {
  title: string;
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to create todo');
  return response.json();
}

function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTodo,

    onMutate: async (newTodoData) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Create optimistic todo with temporary ID
      const optimisticTodo: Todo = {
        id: `temp-${uuidv4()}`,
        title: newTodoData.title,
        completed: false,
      };

      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        return old ? [...old, optimisticTodo] : [optimisticTodo];
      });

      return { previousTodos, optimisticTodo };
    },

    onError: (err, newTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    onSuccess: (data, variables, context) => {
      // Replace optimistic todo with real one from server
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [data];
        return old.map((todo) =>
          todo.id === context?.optimisticTodo.id ? data : todo
        );
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

### Deleting Items from a List

Deleting items optimistically with proper rollback handling.

```typescript
async function deleteTodo(id: string): Promise<void> {
  const response = await fetch(`/api/todos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete todo');
}

function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodo,

    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically remove the todo
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return old;
        return old.filter((todo) => todo.id !== todoId);
      });

      // Also remove from individual cache
      queryClient.removeQueries({ queryKey: ['todo', todoId] });

      return { previousTodos };
    },

    onError: (err, todoId, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

## Handling Complex State Updates

### Nested Data Structures

When dealing with nested data, use immutable update patterns.

```typescript
interface Comment {
  id: string;
  text: string;
  author: string;
  replies: Comment[];
}

interface Post {
  id: string;
  title: string;
  comments: Comment[];
}

interface AddReplyInput {
  postId: string;
  commentId: string;
  text: string;
}

function useAddReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddReplyInput) => {
      const response = await fetch(
        `/api/posts/${input.postId}/comments/${input.commentId}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text }),
        }
      );
      if (!response.ok) throw new Error('Failed to add reply');
      return response.json();
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['post', input.postId] });

      const previousPost = queryClient.getQueryData<Post>(['post', input.postId]);

      const optimisticReply: Comment = {
        id: `temp-${Date.now()}`,
        text: input.text,
        author: 'You',
        replies: [],
      };

      // Helper function to add reply to nested structure
      const addReplyToComment = (comments: Comment[]): Comment[] => {
        return comments.map((comment) => {
          if (comment.id === input.commentId) {
            return {
              ...comment,
              replies: [...comment.replies, optimisticReply],
            };
          }
          if (comment.replies.length > 0) {
            return {
              ...comment,
              replies: addReplyToComment(comment.replies),
            };
          }
          return comment;
        });
      };

      queryClient.setQueryData<Post>(['post', input.postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          comments: addReplyToComment(old.comments),
        };
      });

      return { previousPost, optimisticReply };
    },

    onError: (err, input, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(['post', input.postId], context.previousPost);
      }
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}
```

### Paginated Data

Updating items in paginated queries requires handling multiple page caches.

```typescript
import { InfiniteData } from '@tanstack/react-query';

interface TodoPage {
  items: Todo[];
  nextCursor: string | null;
}

function useToggleTodoInPaginated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTodo,

    onMutate: async (updatedTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos', 'infinite'] });

      const previousData = queryClient.getQueryData<InfiniteData<TodoPage>>([
        'todos',
        'infinite',
      ]);

      // Update across all pages
      queryClient.setQueryData<InfiniteData<TodoPage>>(
        ['todos', 'infinite'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((todo) =>
                todo.id === updatedTodo.id
                  ? { ...todo, completed: updatedTodo.completed }
                  : todo
              ),
            })),
          };
        }
      );

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['todos', 'infinite'], context.previousData);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'infinite'] });
    },
  });
}
```

## Error Handling and User Feedback

### Toast Notifications for Errors

Provide clear feedback when optimistic updates fail.

```typescript
import toast from 'react-hot-toast';

function useLikeMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toggleLike(postId),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previousPost = queryClient.getQueryData<Post>(['post', postId]);

      queryClient.setQueryData<Post>(['post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          liked: !old.liked,
          likeCount: old.liked ? old.likeCount - 1 : old.likeCount + 1,
        };
      });

      return { previousPost };
    },

    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }

      // Show error toast
      toast.error('Failed to update like. Please try again.', {
        duration: 4000,
        position: 'bottom-center',
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}
```

### Retry Mechanism with User Confirmation

For critical operations, let users retry failed mutations.

```typescript
function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const [pendingRetry, setPendingRetry] = useState<{
    variables: UpdateProfileInput;
    context: { previousProfile: Profile };
  } | null>(null);

  const mutation = useMutation({
    mutationFn: updateProfile,

    onMutate: async (updatedProfile) => {
      await queryClient.cancelQueries({ queryKey: ['profile'] });
      const previousProfile = queryClient.getQueryData<Profile>(['profile']);

      queryClient.setQueryData<Profile>(['profile'], (old) => {
        if (!old) return old;
        return { ...old, ...updatedProfile };
      });

      return { previousProfile };
    },

    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile'], context.previousProfile);
      }

      // Store for potential retry
      setPendingRetry({
        variables,
        context: { previousProfile: context?.previousProfile as Profile },
      });
    },

    onSuccess: () => {
      setPendingRetry(null);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const retry = () => {
    if (pendingRetry) {
      mutation.mutate(pendingRetry.variables);
    }
  };

  const dismiss = () => {
    setPendingRetry(null);
  };

  return { ...mutation, pendingRetry, retry, dismiss };
}

// Usage in component
function ProfileEditor() {
  const { mutate, pendingRetry, retry, dismiss, isPending } =
    useUpdateProfileMutation();

  return (
    <div>
      {/* Form here */}

      {pendingRetry && (
        <div className="error-banner">
          <p>Failed to save changes.</p>
          <button onClick={retry}>Retry</button>
          <button onClick={dismiss}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
```

## Optimistic Updates with Forms

### Form Submission Pattern

Handle form submissions with optimistic updates and validation.

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

type TodoFormData = z.infer<typeof todoSchema>;

function TodoForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: TodoFormData) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create todo');
      return response.json();
    },

    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        ...newTodo,
        completed: false,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old ? [optimisticTodo, ...old] : [optimisticTodo]
      );

      // Reset form immediately for better UX
      reset();

      return { previousTodos, optimisticTodo };
    },

    onError: (err, newTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      toast.error('Failed to create todo');
    },

    onSuccess: (data, variables, context) => {
      // Replace temp todo with real one
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [data];
        return old.map((todo) =>
          todo.id === context?.optimisticTodo.id ? data : todo
        );
      });
      toast.success('Todo created!');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const onSubmit = (data: TodoFormData) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('title')}
          placeholder="What needs to be done?"
          disabled={createMutation.isPending}
        />
        {errors.title && <span className="error">{errors.title.message}</span>}
      </div>

      <div>
        <textarea
          {...register('description')}
          placeholder="Description (optional)"
          disabled={createMutation.isPending}
        />
      </div>

      <div>
        <select {...register('priority')} disabled={createMutation.isPending}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Adding...' : 'Add Todo'}
      </button>
    </form>
  );
}
```

## Creating Reusable Optimistic Update Hooks

### Generic Optimistic Update Helper

Create a reusable pattern for optimistic updates.

```typescript
type OptimisticContext<T> = {
  previousData: T | undefined;
};

interface UseOptimisticMutationOptions<TData, TVariables> {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  updateFn: (old: TData | undefined, variables: TVariables) => TData | undefined;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

function useOptimisticMutation<TData, TVariables>({
  queryKey,
  mutationFn,
  updateFn,
  onSuccess,
  onError,
}: UseOptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (variables): Promise<OptimisticContext<TData>> => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TData>(queryKey);

      queryClient.setQueryData<TData>(queryKey, (old) =>
        updateFn(old, variables)
      );

      return { previousData };
    },

    onError: (error, variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error as Error);
    },

    onSuccess: (data) => {
      onSuccess?.(data);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage
function useTodoCompleteMutation(todoId: string) {
  return useOptimisticMutation({
    queryKey: ['todo', todoId],
    mutationFn: (completed: boolean) =>
      updateTodo({ id: todoId, completed }),
    updateFn: (old, completed) =>
      old ? { ...old, completed } : old,
    onSuccess: () => toast.success('Todo updated'),
    onError: () => toast.error('Failed to update todo'),
  });
}
```

### List-Specific Optimistic Hook

```typescript
interface UseOptimisticListMutationOptions<TItem, TVariables> {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TItem>;
  getItemId: (item: TItem) => string;
  getUpdateId: (variables: TVariables) => string;
  updateItemFn: (item: TItem, variables: TVariables) => TItem;
}

function useOptimisticListMutation<TItem, TVariables>({
  queryKey,
  mutationFn,
  getItemId,
  getUpdateId,
  updateItemFn,
}: UseOptimisticListMutationOptions<TItem, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData<TItem[]>(queryKey);

      const updateId = getUpdateId(variables);

      queryClient.setQueryData<TItem[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((item) =>
          getItemId(item) === updateId ? updateItemFn(item, variables) : item
        );
      });

      return { previousItems };
    },

    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Usage
function useTodoListUpdate() {
  return useOptimisticListMutation({
    queryKey: ['todos'],
    mutationFn: updateTodo,
    getItemId: (todo) => todo.id,
    getUpdateId: (variables) => variables.id,
    updateItemFn: (todo, variables) => ({ ...todo, ...variables }),
  });
}
```

## Handling Concurrent Mutations

### Mutation Queue

Prevent race conditions with sequential mutation processing.

```typescript
import { useRef, useCallback } from 'react';

function useMutationQueue<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const queue = useRef<Array<{
    variables: TVariables;
    resolve: (data: TData) => void;
    reject: (error: Error) => void;
  }>>([]);
  const processing = useRef(false);

  const processQueue = useCallback(async () => {
    if (processing.current || queue.current.length === 0) return;

    processing.current = true;

    while (queue.current.length > 0) {
      const item = queue.current.shift();
      if (!item) continue;

      try {
        const result = await mutationFn(item.variables);
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      }
    }

    processing.current = false;
  }, [mutationFn]);

  const enqueue = useCallback(
    (variables: TVariables): Promise<TData> => {
      return new Promise((resolve, reject) => {
        queue.current.push({ variables, resolve, reject });
        processQueue();
      });
    },
    [processQueue]
  );

  return enqueue;
}

// Usage
function useTodoReorder() {
  const queryClient = useQueryClient();
  const enqueueMutation = useMutationQueue(reorderTodo);

  return useMutation({
    mutationFn: enqueueMutation,

    onMutate: async (reorderData) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Apply optimistic reorder
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return old;
        const newTodos = [...old];
        const [moved] = newTodos.splice(reorderData.fromIndex, 1);
        newTodos.splice(reorderData.toIndex, 0, moved);
        return newTodos;
      });

      return { previousTodos };
    },

    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

### Debounced Optimistic Updates

For rapid updates like text editing, debounce the server sync while keeping the UI responsive.

```typescript
import { useDebouncedCallback } from 'use-debounce';

function useDebouncedOptimisticUpdate(todoId: string) {
  const queryClient = useQueryClient();
  const [localTitle, setLocalTitle] = useState('');

  const { data: todo } = useQuery({
    queryKey: ['todo', todoId],
    queryFn: () => fetchTodo(todoId),
  });

  // Sync local state with server data
  useEffect(() => {
    if (todo) {
      setLocalTitle(todo.title);
    }
  }, [todo]);

  const mutation = useMutation({
    mutationFn: (title: string) => updateTodo({ id: todoId, title }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todo', todoId] });
    },
  });

  // Debounced mutation - only syncs to server after 500ms of no changes
  const debouncedSync = useDebouncedCallback((title: string) => {
    mutation.mutate(title);
  }, 500);

  const handleTitleChange = (newTitle: string) => {
    // Update local state immediately (optimistic)
    setLocalTitle(newTitle);

    // Also update the query cache for other components
    queryClient.setQueryData<Todo>(['todo', todoId], (old) =>
      old ? { ...old, title: newTitle } : old
    );

    // Debounce the server sync
    debouncedSync(newTitle);
  };

  return {
    title: localTitle,
    setTitle: handleTitleChange,
    isSyncing: mutation.isPending,
    syncError: mutation.error,
  };
}
```

## Testing Optimistic Updates

### Unit Testing Mutations

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useTodoToggle', () => {
  it('optimistically updates todo completion', async () => {
    const queryClient = new QueryClient();
    const wrapper = createWrapper();

    // Pre-populate cache
    queryClient.setQueryData(['todo', '1'], {
      id: '1',
      title: 'Test Todo',
      completed: false,
    });

    const { result } = renderHook(() => useTodoToggle(), { wrapper });

    // Trigger mutation
    result.current.mutate({ id: '1', completed: true });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const todo = queryClient.getQueryData<Todo>(['todo', '1']);
      expect(todo?.completed).toBe(true);
    });
  });

  it('rolls back on error', async () => {
    // Mock failed API call
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const queryClient = new QueryClient();
    const wrapper = createWrapper();

    queryClient.setQueryData(['todo', '1'], {
      id: '1',
      title: 'Test Todo',
      completed: false,
    });

    const { result } = renderHook(() => useTodoToggle(), { wrapper });

    result.current.mutate({ id: '1', completed: true });

    // Wait for rollback
    await waitFor(() => {
      const todo = queryClient.getQueryData<Todo>(['todo', '1']);
      expect(todo?.completed).toBe(false);
    });
  });
});
```

### Integration Testing with MSW

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.patch('/api/todos/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        ...req.body,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('shows optimistic update then confirms with server', async () => {
  render(<TodoApp />);

  const checkbox = screen.getByRole('checkbox', { name: /test todo/i });
  expect(checkbox).not.toBeChecked();

  // Click to toggle
  fireEvent.click(checkbox);

  // Should be checked immediately (optimistic)
  expect(checkbox).toBeChecked();

  // Wait for server confirmation
  await waitFor(() => {
    expect(screen.queryByText(/syncing/i)).not.toBeInTheDocument();
  });

  // Should still be checked after server confirms
  expect(checkbox).toBeChecked();
});

it('shows error and rolls back on failure', async () => {
  server.use(
    rest.patch('/api/todos/:id', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<TodoApp />);

  const checkbox = screen.getByRole('checkbox', { name: /test todo/i });
  fireEvent.click(checkbox);

  // Should be checked optimistically
  expect(checkbox).toBeChecked();

  // Wait for rollback
  await waitFor(() => {
    expect(checkbox).not.toBeChecked();
  });

  // Should show error message
  expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
});
```

## Performance Optimization

### Reducing Re-renders

Use selective subscriptions to minimize re-renders.

```typescript
function TodoItem({ todoId }: { todoId: string }) {
  // Only subscribe to specific fields
  const completed = useQuery({
    queryKey: ['todo', todoId],
    queryFn: () => fetchTodo(todoId),
    select: (data) => data.completed,
  });

  const toggleMutation = useTodoToggle();

  return (
    <input
      type="checkbox"
      checked={completed.data ?? false}
      onChange={() =>
        toggleMutation.mutate({
          id: todoId,
          completed: !completed.data,
        })
      }
    />
  );
}
```

### Batch Updates

Group related updates together.

```typescript
function useBatchTodoUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; completed: boolean }>) => {
      const response = await fetch('/api/todos/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error('Batch update failed');
      return response.json();
    },

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Apply all updates optimistically
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return old;

        const updateMap = new Map(
          updates.map((u) => [u.id, u.completed])
        );

        return old.map((todo) =>
          updateMap.has(todo.id)
            ? { ...todo, completed: updateMap.get(todo.id)! }
            : todo
        );
      });

      return { previousTodos };
    },

    onError: (err, updates, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

## Summary

| Pattern | Use Case | Key Consideration |
|---------|----------|-------------------|
| **Basic Toggle** | Like buttons, checkboxes | Simple state flip with rollback |
| **List Updates** | Updating items in arrays | Update both list and item caches |
| **Add to List** | Creating new items | Generate temporary IDs |
| **Delete from List** | Removing items | Store full item for rollback |
| **Nested Data** | Comments, replies | Immutable deep updates |
| **Paginated Data** | Infinite scroll lists | Update across all pages |
| **Form Submission** | Create/edit forms | Reset form on optimistic success |
| **Debounced Updates** | Text editors | Local state + debounced sync |
| **Concurrent Mutations** | Drag and drop | Mutation queue or debouncing |

## Key Takeaways

1. **Always cancel queries** before applying optimistic updates to prevent race conditions

2. **Snapshot previous state** in `onMutate` for reliable rollbacks

3. **Invalidate queries in `onSettled`** to ensure eventual consistency with the server

4. **Provide user feedback** when optimistic updates fail and rollback occurs

5. **Use temporary IDs** for new items and replace them with server-generated IDs on success

6. **Consider debouncing** for rapid updates to reduce server load

7. **Test both success and failure paths** to ensure rollbacks work correctly

Optimistic updates significantly improve perceived performance in React applications. React Query's mutation callbacks provide a clean, declarative way to implement this pattern while handling the complexity of state management and error recovery.
