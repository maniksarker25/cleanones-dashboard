"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MdChevronRight, MdEdit, MdOutlineClose } from "react-icons/md";
import { TbCameraPlus, TbCamera, TbChecklist, TbClock, TbDoor, TbLayersLinked, TbMapPin, TbRepeat } from "react-icons/tb";
import type { Room } from "@/components/rooms/types";
import { roomTypeColors } from "@/components/rooms/RoomCard";
import { Select } from "@/components/ui/select";
import { getRoom, updateRoom, type RoomDetails, type RoomTaskInput } from "@/services/actions/rooms";
import { MONTH_DAYS, WEEKDAYS, scheduleSummary } from "@/components/rooms/taskSchedule";
import { DetailSkeleton } from "@/components/shared/SkeletonLoader";

const AddRoomModal = dynamic(() => import("@/components/rooms/AddRoomModal").then((mod) => mod.AddRoomModal), { ssr: false });

type RoomTask = RoomDetails["tasks"][number];

export function RoomTasksPanel({ room, locationId, locationName, onBackToLocation, onBackToLocations }: { room: Room; locationId: string; locationName: string; onBackToLocation: () => void; onBackToLocations: () => void }) {
  const colors = roomTypeColors[room.type] ?? roomTypeColors.Standard;
  const [details, setDetails] = useState<RoomDetails | null>(null);
  const [error, setError] = useState("");
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [editingTask, setEditingTask] = useState<RoomTask | null>(null);

  const load = () => { setError(""); void getRoom(room.id).then((result) => result.success ? setDetails(result.data) : setError(result.error)); };
  useEffect(() => { setDetails(null); load(); }, [room.id]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-400">
        <button type="button" onClick={onBackToLocations} className="hover:text-sky-600">Locations</button>
        <MdChevronRight className="text-sm" />
        <button type="button" onClick={onBackToLocation} className="hover:text-sky-600">{locationName}</button>
        <MdChevronRight className="text-sm" />
        <span className="font-semibold text-slate-700">{details?.room_name ?? room.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <TbDoor className={`${colors.text} text-xl`} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900">{details?.room_name ?? room.name}</h2>
          <p className={`text-xs font-medium ${colors.text}`}>{room.type}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowEditRoom(true)}
          className="flex h-8 shrink-0 items-center gap-1 rounded bg-sky-500 px-3 text-xs font-semibold text-white hover:bg-sky-600"
        >
          <MdEdit className="text-sm" /> Edit room
        </button>
        <button type="button" onClick={onBackToLocation} className="shrink-0 rounded border border-gray-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Back to rooms
        </button>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">{error}</p>}

      {!details && !error ? (
        <DetailSkeleton blocks={4} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Tasks — boxes */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-slate-800">Tasks ({details?.tasks?.length ?? 0})</p>
            {!details?.tasks?.length ? (
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-gray-200 bg-slate-50 py-10 text-center">
                <TbChecklist className="mb-2 text-3xl text-gray-300" />
                <p className="text-xs font-semibold text-gray-500">No tasks added for this room.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {details.tasks.map((task) => (
                  <div key={task.id} className="group relative rounded-lg border border-gray-200 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-sky-200 hover:bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <p className="pr-5 text-sm font-semibold text-gray-800">{task.name}</p>
                      {typeof task.duration_minutes === "number" && (
                        <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[11px] font-bold text-gray-600 border border-gray-200">{task.duration_minutes}m</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
                        <TbRepeat className="text-xs" /> {scheduleSummary(task)}
                      </span>
                      {task.is_photo_req && (
                        <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                          <TbCameraPlus className="text-xs" /> {task.total_photos_required || task.photo?.length || 0} photo(s)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingTask(task)}
                      className="absolute right-2.5 top-2.5 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-white hover:text-sky-600 group-hover:opacity-100"
                      title="Edit task"
                    >
                      <MdEdit className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side info */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<TbClock />} value={`${details?.duration ?? room.duration}m`} label="Duration" />
              <MiniStat icon={<TbCamera />} value={details?.total_photos_required ?? room.photos} label="Photos" />
              <MiniStat icon={<TbChecklist />} value={details?.task_number ?? room.tasks} label="Tasks" />
            </div>
            <InfoRow icon={<TbMapPin />} label="Location" value={details?.location_name ?? locationName} />
            <InfoRow icon={<TbLayersLinked />} label="Cleaning Plan" value={details?.clean_type ?? room.cleaningPlan} valueClassName={colors.text} />
          </div>
        </div>
      )}

      {showEditRoom && (
        <AddRoomModal
          editRoomId={room.id}
          presetLocation={{ id: locationId, name: locationName }}
          onClose={() => setShowEditRoom(false)}
          onAdd={() => { setShowEditRoom(false); load(); }}
        />
      )}

      {editingTask && details && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={async (updated) => {
            const newTasks: RoomTaskInput[] = details.tasks.map((t) => (t.id === editingTask.id ? updated : t));
            const result = await updateRoom(room.id, {
              clean_type: details.clean_type,
              room_name: details.room_name,
              room_type: details.room_type,
              tasks: newTasks,
            });
            if (!result.success) return result.error;
            setEditingTask(null);
            load();
            return null;
          }}
        />
      )}
    </div>
  );
}

function TaskEditModal({ task, onClose, onSave }: { task: RoomTask; onClose: () => void; onSave: (task: RoomTaskInput) => Promise<string | null> }) {
  const [name, setName] = useState(task.name);
  const [frequencyType, setFrequencyType] = useState(task.frequency_type);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(task.days_of_week ?? []);
  const [daysOfMonth, setDaysOfMonth] = useState<number[]>(task.days_of_month ?? []);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(task.duration_minutes);
  const [isPhotoReq, setIsPhotoReq] = useState(task.is_photo_req);
  const [photos, setPhotos] = useState(task.photo.length ? task.photo : [{ name: "" }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleWeekday = (day: string) => setDaysOfWeek((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  const toggleMonthDay = (day: number) => setDaysOfMonth((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("Task name is required.");
    if (isPhotoReq && (!photos.length || photos.some((p) => !p.name.trim()))) return setError("Every required photo needs a name.");
    if (frequencyType === "weekly" && !daysOfWeek.length) return setError("Select at least one day of the week.");
    if (frequencyType === "monthly" && !daysOfMonth.length) return setError("Select at least one date of the month.");
    setSaving(true);
    setError("");
    const errorMessage = await onSave({
      id: task.id,
      name,
      frequency_type: frequencyType,
      is_photo_req: isPhotoReq,
      photo: isPhotoReq ? photos : [],
      duration_minutes: durationMinutes,
      days_of_week: frequencyType === "weekly" ? daysOfWeek : undefined,
      days_of_month: frequencyType === "monthly" ? daysOfMonth : undefined,
    });
    setSaving(false);
    if (errorMessage) setError(errorMessage);
  };

  return (
    <div onClick={onClose} className="modal-backdrop fixed inset-0 z-[80] flex items-center justify-center p-4">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Edit Task</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><MdOutlineClose className="text-lg" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block text-xs font-semibold text-slate-700">
            Task Name *
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Frequency Type *
              <div className="mt-1">
                <Select
                  value={frequencyType}
                  onValueChange={setFrequencyType}
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
              </div>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Duration (min)
              <input
                type="number"
                min={0}
                value={durationMinutes ?? ""}
                onChange={(e) => setDurationMinutes(e.target.value === "" ? undefined : Number(e.target.value))}
                className="mt-1 h-10 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          {frequencyType === "weekly" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-700">Days of the week *</p>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`h-9 rounded border text-xs font-semibold ${daysOfWeek.includes(day.value) ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequencyType === "monthly" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-700">Dates of the month *</p>
              <div className="grid grid-cols-7 gap-1.5">
                {MONTH_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthDay(day)}
                    className={`h-9 rounded border text-xs font-semibold ${daysOfMonth.includes(day) ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isPhotoReq}
              onChange={(e) => { setIsPhotoReq(e.target.checked); if (e.target.checked && !photos.length) setPhotos([{ name: "" }]); }}
              className="rounded border-gray-300 text-sky-500 focus:ring-sky-500"
            />
            Photo required
          </label>
          {isPhotoReq && (
            <div className="space-y-2 border-l-2 border-sky-100 pl-4">
              {photos.map((photo, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    required
                    value={photo.name}
                    onChange={(e) => setPhotos((items) => items.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))}
                    placeholder="Required photo name"
                    className="h-9 w-full rounded border border-gray-300 px-3 text-xs outline-none focus:border-sky-500"
                  />
                  <button type="button" onClick={() => setPhotos((items) => items.filter((_, i) => i !== index))} className="shrink-0 text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => setPhotos((items) => [...items, { name: "" }])} className="text-xs font-semibold text-sky-600 hover:underline">+ Add Photo</button>
            </div>
          )}
          {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50">Cancel</button>
          <button disabled={saving} className="rounded bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60">{saving ? "Saving..." : "Save task"}</button>
        </div>
      </form>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded border border-gray-200 bg-white py-3">
      <span className="text-gray-400">{icon}</span>
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, valueClassName }: { icon: React.ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded border border-gray-200 bg-white px-3.5 py-3">
      <span className="mt-0.5 text-sky-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-semibold text-gray-800 ${valueClassName ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}
