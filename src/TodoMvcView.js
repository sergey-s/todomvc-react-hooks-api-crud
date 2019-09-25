import React from "react";
import classNames from "classnames";

const FILTER_ALL = "all";
const FILTER_ACTIVE = "active";
const FILTER_COMPLETED = "completed";

class TodoMvcView extends React.Component {
  state = { filter: FILTER_ALL };

  getActiveTodos = () => this.props.todos.filter(({ completed }) => !completed);

  getCompletedTodos = () => this.props.todos.filter(({ completed }) => completed);

  getActiveCount = () => this.getActiveTodos().length;

  applyFilter = (filter) => this.setState({ filter });

  getFilteredTodos = () => {
    switch (this.state.filter) {
      case FILTER_ACTIVE:
        return this.getActiveTodos();
      case FILTER_COMPLETED:
        return this.getCompletedTodos();
      case FILTER_ALL:
      default:
        return this.props.todos;
    }
  };

  render() {
    const filteredTodos = this.getFilteredTodos();
    const { loading, error, modifyingTodos, errorTodos, retry, todos } = this.props;
    const { create, update, remove, toggleAll, clearCompleted } = this.props;
    const activeCount = this.getActiveCount();
    const completedCount = this.props.todos.length - activeCount;
    const { filter } = this.state;

    return (
      <Layout>
        <Header>
          <h1>todos</h1>
          <RequestStatus loading={loading} error={error} retry={retry} />
          <NewTodo onSubmit={create} />
        </Header>
        {
          !todos.length || (<>
            <Main>
              <TodoList
                modifyingTodos={modifyingTodos}
                errorTodos={errorTodos}
                todos={filteredTodos}
                onUpdate={update}
                onRemove={remove}
                toggleAll={toggleAll}
                hasActive={activeCount > 0}
              />
            </Main>
            <Footer>
              <ActiveCount value={activeCount} />
              <Filters enabledFilter={filter} applyFilter={this.applyFilter} />
              {!completedCount || <ClearCompleted onClick={clearCompleted} />}
            </Footer>
          </>)
        }
      </Layout>
    );
  }
}

const RequestStatus = ({ loading, error, retry }) => (
  <h5 style={{ position: "absolute", top: -48, right: 10, color: error ? "red" : "inherit" }}>
    {!loading || <>Loading...</>}
    {!error || <>{error} <a href="#" onClick={(e) => {
      e.preventDefault();
      retry();
    }}>RETRY</a></>}
  </h5>
);

// Layout components ---------------------------------------------------------------------------------------------------

const Layout = ({ children }) => <section className="todoapp">{children}</section>;

const Header = ({ children }) => (
  <header className="header">
    {children}
  </header>
);

const Main = ({ children }) => (
  <section className="main">
    {children}
  </section>
);

const Footer = ({ children }) => <footer className="footer">{children}</footer>;

// Header components ---------------------------------------------------------------------------------------------------

class NewTodo extends React.Component {
  state = { title: "" };

  handleChange = (e) => this.setState({ title: e.target.value });

  handleSubmit = (e) => {
    e.preventDefault();
    if (this.state.title.length) {
      this.props.onSubmit({ title: this.state.title, completed: false });
      this.setState({ title: "" });
    }
  };

  render() {
    const { title } = this.state;

    return (
      <form onSubmit={this.handleSubmit}>
        <input onChange={this.handleChange} value={title} className="new-todo" placeholder="What needs to be done?" />
      </form>
    );
  }
}

// Main section components ---------------------------------------------------------------------------------------------

const TodoList = ({ todos, onUpdate, onRemove, toggleAll, hasActive }) => (<>
  <input id="toggle-all" className="toggle-all" type="checkbox" onChange={toggleAll} checked={!hasActive} />
  <label htmlFor="toggle-all">Mark all as complete</label>
  <ul className="todo-list">
    {
      todos
        .sort((a, b) => a.id > b.id ? 1 : -1)
        .map(
          (todo) => <TodoItem key={`${todo.id}::${todo.title}`} todo={todo} onUpdate={onUpdate} onRemove={onRemove} />
        )
    }
  </ul>
</>);

class TodoItem extends React.Component {
  state = {
    editing: false,
    submitting: false,
    removing: false,
    newTitle: "",
  };

  ESCAPE_KEY = 27;
  ENTER_KEY = 13;

  inputRef = React.createRef();

  startEditing = () => {
    this.setState({
      editing: true,
      newTitle: this.props.todo.title,
    },
    () => this.inputRef.current.focus()
    );
  };

  closeEditing = () => this.setState({ editing: false });

  handleNewTitleChange = (e) => this.setState({ newTitle: e.target.value });

  submitUpdate = () => {
    if (this.state.newTitle !== this.props.todo.title) {
      this.setState({ submitting: true });
      this.props.onUpdate({ ...this.props.todo, title: this.state.newTitle });
    }
  };

  handleKeyDown = (e) => {
    if (e.which === this.ESCAPE_KEY) {
      this.setState({ newTitle: this.props.todo.title });
      this.closeEditing();
    } else if (e.which === this.ENTER_KEY) {
      this.submitUpdate(e);
    }
  };

  remove = () => {
    this.setState({ removing: true });
    this.props.onRemove(this.props.todo);
  };

  toggleCompleted = () => this.props.onUpdate({ ...this.props.todo, completed: !this.props.todo.completed });

  render() {
    const { title, completed } = this.props.todo;
    const { editing, submitting, removing, newTitle } = this.state;

    return (
      <li className={classNames({ completed, editing })} style={{ background: removing ? "#eee" : null }}>
        <div className="view">
          <input className="toggle" type="checkbox" checked={completed} onChange={this.toggleCompleted} />
          <label onDoubleClick={this.startEditing}>{title}</label>
          <button className="destroy" onClick={this.remove} />
        </div>
        <input
          className="edit"
          value={newTitle}
          ref={this.inputRef}
          disabled={submitting}
          onChange={this.handleNewTitleChange}
          onBlur={this.submitUpdate}
          onKeyDown={this.handleKeyDown}
          autoFocus
        />
      </li>
    );
  }
}

// Footer components ---------------------------------------------------------------------------------------------------

const ActiveCount = ({ value }) => <span className="todo-count"><strong>{value}</strong> item left</span>;

const Filters = ({ enabledFilter, applyFilter }) => (
  <ul className="filters">
    <li>
      <a onClick={() => applyFilter(FILTER_ALL)} className={classNames({ selected: enabledFilter === FILTER_ALL })}
        href="#">All</a>
    </li>
    <li>
      <a onClick={() => applyFilter(FILTER_ACTIVE)}
        className={classNames({ selected: enabledFilter === FILTER_ACTIVE })} href="#">Active</a>
    </li>
    <li>
      <a onClick={() => applyFilter(FILTER_COMPLETED)}
        className={classNames({ selected: enabledFilter === FILTER_COMPLETED })} href="#">Completed</a>
    </li>
  </ul>
);

const ClearCompleted = ({ onClick }) => <button className="clear-completed" onClick={onClick}>Clear completed</button>;

export default TodoMvcView;
