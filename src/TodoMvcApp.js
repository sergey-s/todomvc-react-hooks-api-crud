import React, { useEffect } from "react";
import axios from "axios";
import TodoMvcView from "./TodoMvcView";
import {
  provideAxiosInstance, useGetData, usePostCallback, useParallelPatchCallback, useParallelDeleteCallback
} from "use-axios-react";

// Construct and provide an axios instance to use with the axios hooks *************************************************

/**
 * Implement some random error on our axios instance to be able to test the retry() function
 */
const ERROR_LIKELIHOOD = 0.2;

const axiosInstance = axios.create({ baseURL: "https://todo-backend-node-koa.herokuapp.com" });
axiosInstance.interceptors.request.use(function (config) {
  return { ...config, url: (Math.random() < ERROR_LIKELIHOOD ? "404" : "") + config.url };
});

provideAxiosInstance(axiosInstance);

/**
 * Function mapping Todos to axios request config objects
 */
function todoToRequest({ id, title, completed }) {
  return {
    url: `/todos/${id || ""}`,
    data: { title, completed }
  };
}

const TodoMvcApp = () => {

  // The CRUD **********************************************************************************************************

  // Load the todos on initial render
  const [todos = [], fetching, { setData: setTodos, ...fetchInfo }] = useGetData("/todos");

  // Declare the create() callback
  const [create, creating, { data: created, ...createInfo }] = usePostCallback(todoToRequest);
  
  // Update todos array every time we create a new one
  // (re-run the useEffect every time the `created` changes i.e. every time we create a new todo)
  useEffect(
    () => { created && setTodos([...todos, created]); },
    [created]
  );

  // Declare the update() callback. Notice that unlike the create() it's now a batch/parallel callback to allow
  // toggle all batch operation.
  const [update, updating, { data: updated, ...updateInfo }] = useParallelPatchCallback(todoToRequest);
  
  // Update the `todos` array every time the `updated` var changes i.e. every time we've updated something
  useEffect(
    () => { setTodos(todos.map((todo) => updated.find(({ id }) => id === todo.id) || todo)); },
    [updated]
  );

  // Declar the batch/parallel remove() callback and update todos inside a useEffect() similarly to the previous exampple
  const [remove, removing, { succeed: removed, ...removeInfo }] = useParallelDeleteCallback(todoToRequest);
  useEffect(
    () => { setTodos(todos.filter((todo) => !removed.includes(todo))); },
    [removed]
  );
  
  // By this point we have our CRUD set up, later code declares some helper methods using the above CRUD callbacks ******

  const toggleAll = () => {
    const newCompleted = Boolean(todos.find(({ completed }) => !completed));
    update(
      todos
        .filter(({ completed }) => completed !== newCompleted)
        .map(({ id }) => ({ id, completed: newCompleted }))
    );
  };

  const clearCompleted = () => remove(todos.filter(({ completed }) => completed));

  // Provide the view with our CRUD and helper methods *****************************************************************

  return (
    <TodoMvcView
      loading={fetching || creating || updating || removing}
      todos={todos}
      create={create}
      update={(todo) => update([todo])}
      remove={(todo) => remove([todo])}
      toggleAll={toggleAll}
      clearCompleted={clearCompleted}
      {...getLastErrorAndRetry(fetchInfo, createInfo, updateInfo, removeInfo)}
    />
  );
};

/**
 * Returns the first { error, retry } pair where error is not null (for simplicity showing a single error & retry)
 */
function getLastErrorAndRetry(fetchInfo, createInfo, updateInfo, removeInfo) {
  switch (true) {
    case Boolean(fetchInfo.error):
      return { error: "fetch failed", retry: fetchInfo.retry };
    case Boolean(createInfo.error):
      return { error: "create failed", retry: createInfo.retry };
    case Boolean(updateInfo.errors.length):
      return { error: "update failed", retry: updateInfo.retry };
    case Boolean(removeInfo.errors.length):
      return { error: "remove failed", retry: removeInfo.retry };
    default:
      return {};
  }
}

export default TodoMvcApp;
