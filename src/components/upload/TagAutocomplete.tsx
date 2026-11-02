'use client';

import { useId, useState } from 'react';
import { AVAILABLE_TAGS } from '@/lib/mock-tag-data';

interface TagAutocompleteProps {
  id: string;
}

export function TagAutocomplete({ id }: TagAutocompleteProps) {
  const listboxId = useId();
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const tags = value.split(',');
  const query = tags[tags.length - 1].trim().toLowerCase();
  const selectedTags = tags.slice(0, -1).map(tag => tag.trim().toLowerCase());
  const suggestions = query
    ? AVAILABLE_TAGS.filter(tag =>
        tag.toLowerCase().startsWith(query) && !selectedTags.includes(tag.toLowerCase())
      )
    : [];
  const showSuggestions = isOpen && suggestions.length > 0;

  const selectTag = (tag: string) => {
    const prefix = value.slice(0, value.lastIndexOf(',') + 1);
    setValue(`${prefix}${prefix ? ' ' : ''}${tag}, `);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        name="tags"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listboxId : undefined}
        aria-activedescendant={
          showSuggestions && activeIndex >= 0
            ? `${listboxId}-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        placeholder="wedding, portrait, outdoor, professional..."
        className="form-input"
        value={value}
        onChange={event => {
          setValue(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;

          if (event.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (
            suggestions.length > 0 &&
            (event.key === 'ArrowDown' || event.key === 'ArrowUp')
          ) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(current => {
              if (!showSuggestions || current < 0) {
                return event.key === 'ArrowDown' ? 0 : suggestions.length - 1;
              }
              const direction = event.key === 'ArrowDown' ? 1 : -1;
              return (current + direction + suggestions.length) % suggestions.length;
            });
          } else if (event.key === 'Enter' && showSuggestions && activeIndex >= 0) {
            event.preventDefault();
            selectTag(suggestions[activeIndex]);
          }
        }}
      />
      {showSuggestions && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Suggested tags"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {suggestions.map((tag, index) => (
            <li
              id={`${listboxId}-${index}`}
              key={tag}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-4 py-2 text-sm ${
                index === activeIndex
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                  : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700'
              }`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectTag(tag)}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
