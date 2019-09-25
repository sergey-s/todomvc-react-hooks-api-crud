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

  // Load the todos once and extract the setTodos() from hook results to update
  // the todos state variable in response to create, update and delete actions
  //
  const [todos = [], fetching, { setData: setTodos, ...fetchInfo }] = useGetData("/todos");

  // Receive the create() callback and update todos state via setTodos() inside a useEffect() react hook
  // (re-run the useEffect every time the created var changes i.e. every time we create a new todo)
  //
  const [create, creating, { data: created, ...createInfo }] = usePostCallback(todoToRequest);
  useEffect(
    () => { created && setTodos([...todos, created]); },
    [created]
  );

  // Receive the update() callback and update todos state in useEffect() whenever we update something.
  //
  // Notice that we're using a batch/parallel hook useParallelPatchCallback() which accepts array of objects while
  // the usePostCallback() in the previous example accepts a single object.
  //
  // The result of the batch/parallel hook is also an array i.e. updated will be an array of updated todo objects.
  //
  // (We're using the batch/parallel version to allow the toggle all batch operation)
  //
  const [update, updating, { data: updated, ...updateInfo }] = useParallelPatchCallback(todoToRequest);
  useEffect(
    () => { setTodos(todos.map((todo) => updated.find(({ id }) => id === todo.id) || todo)); },
    [updated]
  );

  // Using the batch/parallel axios hook for delete to allow the remove all completed batch operation
  //
  const [remove, removing, { succeed: removed, ...removeInfo }] = useParallelDeleteCallback(todoToRequest);
  useEffect(
    () => { setTodos(todos.filter((todo) => !removed.includes(todo))); },
    [removed]
  );

  // Some helper methods using the CRUD callbacks **********************************************************************

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
