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
  const [savingTodoId, setSavingTodoId] = useState<number | null>(null);

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [inputDisabled, setInputDisabled] = useState(false);

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
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally();
  }

  useEffect(() => loadTodos(), []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [todosFromServer]);

  const updateTodo = async (todo: Todo) => {
    if (isSavingAll || savingTodoId !== null) {
      return;
    }

    setSavingTodoId(todo.id);

    try {
      await todoServise.updateTodo(todo);
      loadTodos();
    } catch (error) {
      setErrorMessage('Unable to update todo');
    } finally {
      setSavingTodoId(null);
    }
  };

  const saveAllTodos = async () => {
    if (isSavingAll || savingTodoId !== null) {
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
      setErrorMessage('Unable to delete a todo');
    } finally {
      setIsSavingAll(false);
    }
  };

  const deleteTodo = async (todoId: number) => {
    setSavingTodoId(todoId);

    try {
      await todoServise.deleteTodod(todoId);
      setTodosFromServer(currentTodos =>
        currentTodos.filter(todo => todo.id !== todoId),
      );
      setItemsLeft(prev => prev - 1);
    } catch (error) {
      setErrorMessage('Unable to delete a todo');
    } finally {
      setSavingTodoId(null);
    }
  };

  const addTodo = async ({ id, userId, title, completed }: Todo) => {
    setSavingTodoId(id);
    setInputDisabled(true);

    setTodosFromServer(currentTodos => [
      ...currentTodos,
      { id, userId, title, completed },
    ]);

    try {
      const newTodoFromServer = await todoServise.createTodo({
        userId,
        title,
        completed,
      });

      setTodosFromServer(currentTodos =>
        currentTodos.map(todo =>
          todo.id === id ? { ...todo, id: newTodoFromServer.id } : todo,
        ),
      );

      setItemsLeft(prev => prev + 1);

      setNewTodoTitle('');
      setSavingTodoId(null);
    } catch (error) {
      setErrorMessage('Unable to add todo');
      setTodosFromServer(currentTodos =>
        currentTodos.filter(todo => todo.id !== id),
      );
      setSavingTodoId(null);
    } finally {
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

  const itemLeft = todosFromServer.length - completedTodosId.length;

  const handleNewTodoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoTitle(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTodoTitle.trim()) {
      setErrorMessage('Title should not be empty');

      return;
    }

    const tempId = Date.now();

    const newTodo: Todo = {
      id: tempId,
      userId: todoServise.USER_ID,
      title: newTodoTitle.trim(),
      completed: false,
    };

    addTodo(newTodo);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={cn('todoapp__toggle-all', { active: itemLeft === 0 })}
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
          savingTodoId={savingTodoId}
          onDelete={deleteTodo}
        />

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
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <ErrorNotification
        message={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </div>
  );
};
