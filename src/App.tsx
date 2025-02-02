/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import * as todoServise from './api/todos';
import { Todo } from './types/Todo';
import { TodoList } from './components/TodoList/TodoList';
import { ErrorNotification } from './components/ErrorNotification';
import { FilterTodo } from './components/FilterTodo/FilterTodo';
import { FilterOption } from './types/FilterOption';

export const App: React.FC = () => {
  const [todosFromServer, setTodosFromServer] = useState<Todo[]>([]);
  const [completedTodosId, setCompletedTodosId] = useState<number[]>([]);
  const [option, setOption] = useState(FilterOption.All);

  const [itemsLeft, setItemsLeft] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');

  const [isSavingAll, setIsSavingAll] = useState(false);
  const [savingTodoIds, setSavingTodoIds] = useState<number[]>([]);

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [inputDisabled, setInputDisabled] = useState(false);

  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  function loadTodos() {
    todoServise
      .getTodos()
      .then(data => {
        setTodosFromServer(data);
        setCompletedTodosId(
          data.filter(todo => todo.completed).map(todo => todo.id),
        );
        setItemsLeft(data.filter(todo => !todo.completed).length);
      })
      .catch(() => setErrorMessage('Unable to load todos'));
  }

  useEffect(() => loadTodos(), []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [todosFromServer, inputDisabled]);

  const updateTodo = async (todo: Todo) => {
    if (isSavingAll || savingTodoIds.length > 0) {
      return;
    }

    setSavingTodoIds([todo.id]);

    try {
      await todoServise.updateTodo(todo);
      loadTodos();
    } catch (error) {
      setErrorMessage('Unable to update todo');
    } finally {
      setSavingTodoIds([]);
    }
  };

  useEffect(() => {
    setCompletedTodosId(
      todosFromServer.filter(todo => todo.completed).map(todo => todo.id),
    );
  }, [todosFromServer]);

  const saveAllTodos = async () => {
    if (isSavingAll || savingTodoIds.length > 0) {
      return;
    }

    setIsSavingAll(true);

    try {
      const updatedTodos = todosFromServer.map(todo => ({
        ...todo,
        completed: !todo.completed,
      }));

      await Promise.all(updatedTodos.map(todo => todoServise.updateTodo(todo)));
      loadTodos();
    } catch (error) {
      setErrorMessage('Unable to update a todo');
    } finally {
      setIsSavingAll(false);
    }
  };

  const deleteTodo = async (todoId: number) => {
    setSavingTodoIds([todoId]);

    try {
      await todoServise.deleteTodo(todoId);
      setTodosFromServer(currentTodos =>
        currentTodos.filter(todo => todo.id !== todoId),
      );
      setItemsLeft(prev => prev - 1);
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
    } finally {
      setSavingTodoIds([]);
    }
  };

  const addTodo = async (title: string) => {
    setInputDisabled(true);

    const newTempTodo: Todo = {
      id: 0,
      userId: todoServise.USER_ID,
      title,
      completed: false,
    };

    setTempTodo(newTempTodo);

    try {
      const { userId, completed } = newTempTodo;

      const newTodoFromServer = await todoServise.createTodo({
        userId,
        title,
        completed,
      });

      setTodosFromServer(currentTodos => [...currentTodos, newTodoFromServer]);
      setItemsLeft(prev => prev + 1);
      setNewTodoTitle('');
    } catch (error) {
      setErrorMessage('Unable to add a todo');
    } finally {
      setTempTodo(null);
      setInputDisabled(false);
    }
  };

  const filteredTodos = useMemo(() => {
    return todosFromServer.filter(todo => {
      if (option === FilterOption.Active) {
        return !completedTodosId.includes(todo.id);
      }

      if (option === FilterOption.Completed) {
        return completedTodosId.includes(todo.id);
      }

      return true;
    });
  }, [todosFromServer, completedTodosId, option]);

  const handleNewTodoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoTitle(event.target.value);
  };

  // const handleSubmit = (event: React.FormEvent) => {
  //   event.preventDefault();
  //   setErrorMessage('');
  //   if (!newTodoTitle.trim()) {
  //     setErrorMessage('Title should not be empty');

  //     return;
  //   }

  //   const tempId = Date.now();

  //   const newTodo: Todo = {
  //     id: tempId,
  //     userId: todoServise.USER_ID,
  //     title: newTodoTitle.trim(),
  //     completed: false,
  //   };

  //   addTodo(newTodo);
  // };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');

    if (!newTodoTitle.trim()) {
      setErrorMessage('Title should not be empty');

      return;
    }

    addTodo(newTodoTitle.trim()); // передаём только title
  };

  const handleClearCompleted = async () => {
    setErrorMessage('');
    setSavingTodoIds([...completedTodosId]);

    try {
      const results = await Promise.allSettled(
        completedTodosId.map(id => todoServise.deleteTodo(id)),
      );

      const successfulTodoIds = results
        .map((result, index) =>
          result.status === 'fulfilled' ? completedTodosId[index] : null,
        )
        .filter((id): id is number => id !== null);

      setTodosFromServer(currentTodos =>
        currentTodos.filter(todo => !successfulTodoIds.includes(todo.id)),
      );

      const hasError = results.some(result => result.status === 'rejected');

      if (hasError) {
        setErrorMessage('Unable to delete a todo');
      }
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
    } finally {
      setSavingTodoIds([]);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={cn('todoapp__toggle-all', { active: itemsLeft === 0 })}
            data-cy="ToggleAllButton"
            onClick={saveAllTodos}
          />

          <form onSubmit={handleSubmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={handleNewTodoChange}
              disabled={inputDisabled}
              ref={inputRef}
            />
          </form>
        </header>

        <TodoList
          listOfTodos={filteredTodos}
          onUpdate={updateTodo}
          isSavingAll={isSavingAll}
          onDelete={deleteTodo}
          savingTodoIds={savingTodoIds}
        />
        {tempTodo && (
          <div data-cy="Todo" className="todo">
            <label className="todo__status-label">
              <input
                data-cy="TodoStatus"
                type="checkbox"
                className="todo__status"
              />
            </label>{' '}
            <span data-cy="TodoTitle" className="todo__title">
              {newTodoTitle}
            </span>
            <div data-cy="TodoLoader" className="modal overlay is-active">
              <div className="modal-background has-background-white-ter" />
              <div className="loader" />
            </div>
          </div>
        )}

        {todosFromServer.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${itemsLeft} items left`}
            </span>

            <FilterTodo selectedOption={option} onSelect={setOption} />

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={completedTodosId.length < 1}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <ErrorNotification message={errorMessage} />
    </div>
  );
};
