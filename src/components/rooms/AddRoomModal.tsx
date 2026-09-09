"use client";

import React, { useEffect, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import { TbDoor } from "react-icons/tb";
import { Select } from "@/components/ui/select";
import { createRoom, getRoom, getRoomLocations, updateRoom, type RoomTaskInput } from "@/services/actions/rooms";
import { MONTH_DAYS, WEEKDAYS } from "@/components/rooms/taskSchedule";

interface Props { onClose: () => void; onAdd: () => void; presetLocation?: { id: string; name: string }; editRoomId?: string }
const newTask = (): RoomTaskInput => ({ name: "", frequency_type: "daily", is_photo_req: false, photo: [], duration_minutes: undefined });

export function AddRoomModal({ onClose, onAdd, presetLocation, editRoomId }: Props) {
  const isEdit = Boolean(editRoomId);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("suite");
  const [cleanType, setCleanType] = useState("standard");
  const [tasks, setTasks] = useState<RoomTaskInput[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [locationId, setLocationId] = useState(presetLocation?.id ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [roomLocationName, setRoomLocationName] = useState("");

  useEffect(() => {
    if (!presetLocation) {
      void getRoomLocations().then((result) => {
        if (!result.success) return setError(result.error);
        setLocations(result.data.locations);
        setLocationId((current) => current || result.data.locations[0]?.id || "");
      });
    }
    const esc = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, presetLocation]);

  useEffect(() => {
    if (!editRoomId) return;
    void getRoom(editRoomId).then((result) => {
      setLoading(false);
      if (!result.success) return setError(result.error);
      const room = result.data;
      setRoomName(room.room_name);
      setRoomType(room.room_type);
      setCleanType(room.clean_type);
      setRoomLocationName(room.location_name);
      setTasks(room.tasks.map((task) => ({ id: task.id, name: task.name, frequency_type: task.frequency_type, is_photo_req: task.is_photo_req, photo: task.photo.map((p) => ({ id: p.id, name: p.name })), duration_minutes: task.duration_minutes, days_of_week: task.days_of_week, days_of_month: task.days_of_month })));
    });
  }, [editRoomId]);

  const updateTask = (index: number, update: Partial<RoomTaskInput>) => setTasks((items) => items.map((item, i) => (i === index ? { ...item, ...update } : item)));
  const requirePhoto = (index: number, checked: boolean) => updateTask(index, { is_photo_req: checked, photo: checked ? [{ name: "" }] : [] });
  const updatePhoto = (taskIndex: number, photoIndex: number, name: string) =>
    updateTask(taskIndex, { photo: tasks[taskIndex].photo.map((photo, i) => (i === photoIndex ? { name } : photo)) });
  const setFrequency = (index: number, frequency_type: string) =>
    updateTask(index, { frequency_type, days_of_week: frequency_type === "weekly" ? tasks[index].days_of_week ?? [] : undefined, days_of_month: frequency_type === "monthly" ? tasks[index].days_of_month ?? [] : undefined });
  const toggleWeekday = (index: number, day: string) => {
    const current = tasks[index].days_of_week ?? [];
    updateTask(index, { days_of_week: current.includes(day) ? current.filter((d) => d !== day) : [...current, day] });
  };
  const toggleMonthDay = (index: number, day: number) => {
    const current = tasks[index].days_of_month ?? [];
    updateTask(index, { days_of_month: current.includes(day) ? current.filter((d) => d !== day) : [...current, day] });
  };

  // Duration is never entered manually — the backend always derives the room's overall
  // duration from the sum of its tasks' own durations. This is purely informational display.
  const computedDuration = tasks.reduce((sum, task) => sum + (task.duration_minutes ?? 0), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEdit && !locationId) return setError("Please select a location.");
    if (tasks.some((task) => !task.name.trim() || (task.is_photo_req && (!task.photo.length || task.photo.some((photo) => !photo.name.trim())))))
      return setError("Complete every task and required photo name.");
    if (tasks.some((task) => task.frequency_type === "weekly" && !task.days_of_week?.length))
      return setError("Select at least one day of the week for every weekly task.");
    if (tasks.some((task) => task.frequency_type === "monthly" && !task.days_of_month?.length))
      return setError("Select at least one date of the month for every monthly task.");
    setSaving(true);
    setError("");
    const payload = {
      clean_type: cleanType,
      room_name: roomName,
      room_type: roomType,
      tasks,
    };
    const result = isEdit && editRoomId ? await updateRoom(editRoomId, payload) : await createRoom(locationId, payload);
    setSaving(false);
    if (!result.success) return setError(result.error);
    onAdd();
  };

  return (
    <div onClick={onClose} className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        <header className="flex items-center gap-3 border-b border-gray-100 px-6 py-5 shrink-0 bg-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <TbDoor className="text-xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">{isEdit ? "Edit Room" : "Add New Room"}</h2>
            <p className="text-xs text-slate-400">{isEdit ? "Update the room details and task requirements" : "Enter the room details and task requirements"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
            <MdOutlineClose className="text-xl" />
          </button>
        </header>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading room...</div>
        ) : (
        <div className="space-y-4 overflow-y-auto px-6 py-5 flex-1">
          {/* Location + Room Name in Same Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location *">
              {presetLocation || isEdit ? (
                <div className="flex h-10 w-full items-center rounded border border-gray-200 bg-slate-50 px-3 text-sm text-gray-600">
                  {presetLocation?.name ?? roomLocationName}
                </div>
              ) : (
                <Select
                  value={locationId}
                  onValueChange={setLocationId}
                  options={locations.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Select location"
                  required
                />
              )}
            </Field>
            <Field label="Room Name *">
              <input
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ware House"
                className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition hover:border-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </Field>
          </div>

          {/* Room Type + Clean Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Room Type *">
              <Select
                value={roomType}
                onValueChange={setRoomType}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "deluxe", label: "Deluxe" },
                  { value: "suite", label: "Suite" },
                  { value: "junior_suite", label: "Junior Suite" },
                ]}
                placeholder="Select room type"
                required
              />
            </Field>
            <Field label="Clean Type *">
              <Select
                value={cleanType}
                onValueChange={setCleanType}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "deep_clean", label: "Deep Clean" },
                  { value: "premium", label: "Premium" },
                  { value: "custom", label: "Custom" },
                ]}
                placeholder="Select clean type"
                required
              />
            </Field>
          </div>

          {/* Tasks Section */}
          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Tasks</h3>
                <p className="text-xs text-slate-400">Add task and photo requirements. Room duration is calculated automatically from these.</p>
              </div>
              <button
                type="button"
                onClick={() => setTasks((items) => [...items, newTask()])}
                className="flex h-9 items-center justify-center gap-1 rounded bg-[#0ea5e9] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#0284c7] transition-colors cursor-pointer"
              >
                + Add Task
              </button>
            </div>
            {tasks.length > 0 && (
              <p className="text-xs font-semibold text-slate-500">
                Total duration: <span className="text-slate-800">{computedDuration} min</span>
              </p>
            )}

            {!tasks.length && <p className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md bg-white">No tasks added.</p>}

            {tasks.map((task, taskIndex) => (
              <div key={taskIndex} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <b className="text-xs font-bold text-slate-700">Task {taskIndex + 1}</b>
                  <button
                    type="button"
                    onClick={() => setTasks((items) => items.filter((_, i) => i !== taskIndex))}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Task Name *">
                    <input
                      required
                      value={task.name}
                      onChange={(e) => updateTask(taskIndex, { name: e.target.value })}
                      placeholder="e.g. Floor Vacuuming"
                      className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition hover:border-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </Field>
                  <Field label="Frequency Type *">
                    <Select
                      value={task.frequency_type}
                      onValueChange={(val) => setFrequency(taskIndex, val)}
                      options={[
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ]}
                    />
                  </Field>
                  <Field label="Duration (min)">
                    <input
                      type="number"
                      min={0}
                      value={task.duration_minutes ?? ""}
                      onChange={(e) => updateTask(taskIndex, { duration_minutes: e.target.value === "" ? undefined : Number(e.target.value) })}
                      placeholder="e.g. 15"
                      className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition hover:border-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </Field>
                </div>

                {task.frequency_type === "weekly" && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-700">Days of the week *</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeekday(taskIndex, day.value)}
                          className={`h-9 rounded border text-xs font-semibold cursor-pointer ${(task.days_of_week ?? []).includes(day.value) ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {task.frequency_type === "monthly" && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-700">Dates of the month *</p>
                    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
                      {MONTH_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleMonthDay(taskIndex, day)}
                          className={`h-9 rounded border text-xs font-semibold cursor-pointer ${(task.days_of_month ?? []).includes(day) ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.is_photo_req}
                    onChange={(e) => requirePhoto(taskIndex, e.target.checked)}
                    className="rounded border-gray-300 text-sky-500 focus:ring-sky-500"
                  />
                  Photo required
                </label>
                {task.is_photo_req && (
                  <div className="space-y-2 pl-4 border-l-2 border-sky-100">
                    {task.photo.map((photo, photoIndex) => (
                      <div key={photoIndex} className="flex items-center gap-2">
                        <input
                          required
                          value={photo.name}
                          onChange={(e) => updatePhoto(taskIndex, photoIndex, e.target.value)}
                          placeholder="Required photo name"
                          className="h-9 w-full rounded border border-gray-300 bg-white px-3 text-xs text-gray-800 outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateTask(taskIndex, { photo: task.photo.filter((_, i) => i !== photoIndex) })}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateTask(taskIndex, { photo: [...task.photo, { name: "" }] })}
                      className="text-xs font-semibold text-[#0ea5e9] hover:underline cursor-pointer"
                    >
                      + Add Photo
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>

          {error && <p className="text-xs font-medium text-red-600 rounded bg-red-50 p-2.5 border border-red-200">{error}</p>}
        </div>
        )}

        <footer className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            disabled={saving || loading}
            className="flex h-9 items-center justify-center gap-1.5 rounded bg-[#0ea5e9] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0284c7] transition-colors cursor-pointer disabled:opacity-60"
          >
            {isEdit ? (saving ? "Updating..." : "Update Room") : (saving ? "Adding..." : "+ Add Room")}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}
