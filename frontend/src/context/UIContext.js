import { createContext, useContext, useState, useCallback } from "react";
import TaskDrawer from "@/components/TaskDrawer";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [openTaskId, setOpenTaskId] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  const openTask = useCallback((id) => setOpenTaskId(id), []);
  const closeTask = useCallback(() => setOpenTaskId(null), []);
  const bump = useCallback(() => setDataVersion((v) => v + 1), []);

  return (
    <UIContext.Provider value={{ openTaskId, openTask, closeTask, dataVersion, bump }}>
      {children}
      <TaskDrawer taskId={openTaskId} onClose={closeTask} onMutate={bump} />
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
