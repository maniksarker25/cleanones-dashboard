"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import { TbClipboardList, TbPencil, TbPlus, TbTrash } from "react-icons/tb";
import { createCleaningPlan, getCleaningPlan, getPlanRooms, updateCleaningPlan, type PlanRoomOption, type PlanTaskInput } from "@/services/actions/cleaningPlans";
import { getClientOptions, type ClientOption } from "@/services/actions/locations";
import { getRoomLocations } from "@/services/actions/rooms";
import { Select } from "@/components/ui/select";
import { DatePicker, todayIso } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

const controlClass = "h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
// Additional tasks only follow the plan's own visit schedule — no separate weekly/monthly
// recurrence for them, just "every visit" or one fixed date. `frequency_type` still exists on the
// wire for backward compatibility but is no longer surfaced in this form; it defaults to
// 'every_visit' and is ignored by the backend once `schedule_type` is set.
const newTask = (): PlanTaskInput => ({ name: "", frequency_type: "every_visit", is_photo_req: false, photo: [], duration_minutes: undefined, schedule_type: "recurring", fixed_date: undefined });
const isoDate = (value?: string) => (value ? value.slice(0, 10) : "");
const to24h = (value?: string) => {
  const match = value ? /^(\d{1,2}):(\d{2})(?:\s*([AaPp])\.?[Mm]\.?)?/.exec(value.trim()) : null;
  if (!match) return "08:00";
  let hour = Number(match[1]);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "a" && hour === 12) hour = 0;
  if (meridiem === "p" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

export function CreatePlanModal({ onClose, onAdd, planId }: { onClose: () => void; onAdd: () => void; planId?: string }) {
  const isEdit = Boolean(planId);
  const [clients, setClients] = useState<ClientOption[]>([]), [clientId, setClientId] = useState("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]), [locationId, setLocationId] = useState("");
  const [rooms, setRooms] = useState<PlanRoomOption[]>([]), [roomIds, setRoomIds] = useState<string[]>([]);
  const [title, setTitle] = useState(""), [date, setDate] = useState(""), [startTime, setStartTime] = useState("08:00");
  const [repeatUntil, setRepeatUntil] = useState(""), [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<PlanTaskInput[]>([]), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const hydrating = useRef(isEdit), firstClient = useRef(true), firstLocation = useRef(true);
  const today = useMemo(() => todayIso(), []);
  const minDate = isEdit ? undefined : today;

  useEffect(() => { void getClientOptions(1, 100).then((r) => r.success ? setClients(r.data.clients ?? []) : setError(r.error)); }, []);
  useEffect(() => {
    if (!planId) return;
    void getCleaningPlan(planId).then((r) => {
      setLoading(false);
      if (!r.success) { setError(r.error); hydrating.current = false; return; }
      const plan = r.data;
      setTitle(plan.title ?? ""); setDate(isoDate(plan.date)); setStartTime(to24h(plan.start_time));
      setRepeatUntil(isoDate(plan.repeat_until ?? undefined)); setNotes(plan.shift_notes ?? "");
      setTasks((plan.additional_tasks ?? []).map((task) => ({ id: task.id, name: task.name, frequency_type: task.frequency_type, is_photo_req: task.is_photo_req, photo: (task.photo ?? []).map((photo) => ({ id: photo.id, name: photo.name })), duration_minutes: task.duration_minutes, schedule_type: task.schedule_type ?? "recurring", fixed_date: task.fixed_date })));
      setRooms((plan.rooms ?? []).map((room) => ({ room_id: room.room_id, room_name: room.room_name, room_type: room.room_type, task_number: room.task_number, photo_number: room.total_photos_required })));
      setRoomIds(plan.room_ids?.length ? plan.room_ids : (plan.rooms ?? []).map((room) => room.room_id));
      hydrating.current = false;
    });
  }, [planId]);
  useEffect(() => {
    if (firstClient.current) { firstClient.current = false; if (!clientId) return; }
    setLocationId(""); setLocations([]);
    if (!hydrating.current) { setRooms([]); setRoomIds([]); }
    if (clientId) void getRoomLocations(clientId).then((r) => r.success ? setLocations(r.data.locations ?? []) : setError(r.error));
  }, [clientId]);
  useEffect(() => {
    if (firstLocation.current) { firstLocation.current = false; if (!locationId) return; }
    if (!locationId) { if (!isEdit) { setRooms([]); setRoomIds([]); } return; }
    void getPlanRooms({ clientId, locationId, limit: 100 }).then((r) => {
      if (!r.success) return setError(r.error);
      const fetched = r.data.rooms ?? [];
      setRooms((current) => [...current.filter((room) => roomIds.includes(room.room_id) && !fetched.some((item) => item.room_id === room.room_id)), ...fetched]);
    });
  }, [clientId, locationId]);
  const updateTask = (index: number, update: Partial<PlanTaskInput>) => setTasks((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (!clientId || !locationId)) return setError("Client and location are required.");
    if (!title || !date || !roomIds.length) return setError("Title, date and at least one room are required.");
    if (!isEdit && date < today) return setError("The plan date cannot be in the past.");
    if (repeatUntil && repeatUntil < date) return setError("End date must be on or after the plan date.");
    if (tasks.some((task) => !task.name.trim() || (task.is_photo_req && (!task.photo.length || task.photo.some((photo) => !photo.name.trim()))))) return setError("Complete every additional task and its required photo names.");
    if (tasks.some((task) => task.schedule_type === "fixed_date" && !task.fixed_date)) return setError("Pick a date for every fixed-date additional task.");
    const time = new Date(`2000-01-01T${startTime}`).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setSaving(true); setError("");
    // In edit mode, an emptied field must be sent as `null` so the backend actually clears it
    // (turning the plan back into a one-time visit) — omitting the key would just leave the
    // previously stored value untouched.
    const payload = { title, room_ids: roomIds, date, start_time: time, ...(repeatUntil ? { repeat_until: repeatUntil } : isEdit ? { repeat_until: null } : {}), timezone: "Europe/Amsterdam", shift_notes: notes, additional_tasks: tasks };
    const result = planId ? await updateCleaningPlan(planId, { ...payload, ...(locationId ? { location_id: locationId } : {}) }) : await createCleaningPlan(payload);
    setSaving(false);
    if (!result.success) return setError(result.error);
    onAdd();
  };
  return <div onClick={onClose} className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"><form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-md bg-white shadow"><header className="flex items-center gap-3 border-b p-5">{isEdit ? <TbPencil className="text-xl text-sky-500"/> : <TbClipboardList className="text-xl text-sky-500"/>}<div className="flex-1"><h2 className="font-bold">{isEdit ? "Update Cleaning Plan" : "Create Cleaning Plan"}</h2><p className="text-xs text-slate-400">{isEdit ? "Change rooms, schedule and tasks" : "Select client, location and rooms"}</p></div><button type="button" onClick={onClose}><MdOutlineClose/></button></header>{loading ? <div className="p-12 text-center text-sm text-slate-400">Loading plan...</div> : <div className="space-y-4 overflow-y-auto p-5">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={isEdit ? "Client" : "Client *"}><Select required={!isEdit} value={clientId} onValueChange={setClientId} placeholder={isEdit ? "Change client (optional)" : "Select client"} options={clients.map((c) => ({ value: c.id, label: c.company_name || c.primary_contact_name }))}/></Field><Field label={isEdit ? "Location" : "Location *"}><Select required={!isEdit} disabled={!clientId} value={locationId} onValueChange={setLocationId} placeholder={clientId ? "Select location" : "Select client first"} options={locations.map((l) => ({ value: l.id, label: l.name }))}/></Field></div>
    <Field label="Rooms *"><div className="max-h-40 space-y-1 overflow-y-auto rounded border border-gray-300 bg-slate-50 p-2">{!rooms.length ? <Empty text={locationId ? "No rooms found" : "Select client and location first"}/> : rooms.map((room) => <label key={room.room_id} className="flex gap-2 rounded border border-gray-200 bg-white p-2 text-xs"><input type="checkbox" checked={roomIds.includes(room.room_id)} onChange={() => setRoomIds((ids) => ids.includes(room.room_id) ? ids.filter((id) => id !== room.room_id) : [...ids, room.room_id])}/><span className="flex-1">{room.room_name}</span><span className="text-slate-400">{room.task_number} tasks · {room.photo_number} photos</span></label>)}</div></Field>
    <Field label="Plan title *"><input required value={title} onChange={(e) => setTitle(e.target.value)} className={controlClass}/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Date *"><DatePicker value={date} onValueChange={setDate} min={minDate}/></Field><Field label="Start time *"><TimePicker value={startTime} onValueChange={setStartTime}/></Field></div>
    <Field label="End date (optional)"><DatePicker clearable value={repeatUntil} onValueChange={setRepeatUntil} min={date || minDate} placeholder="Leave empty for a one-time visit"/><p className="mt-1 text-[11px] font-normal text-slate-400">Leave empty for a single one-time visit on the date above. Set an end date for a contract that runs until then — which days actually get a visit is decided by each room&apos;s task schedule.</p></Field>
    <Field label="Shift notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 w-full rounded border border-gray-300 bg-white p-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"/></Field>
    <TaskEditor tasks={tasks} setTasks={setTasks} updateTask={updateTask} minFixedDate={isEdit ? undefined : today}/>
    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
  </div>}<footer className="flex justify-end gap-2 border-t p-4"><button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">Cancel</button><button disabled={saving || loading} className="rounded bg-sky-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update plan" : "Create plan")}</button></footer></form></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block border-b border-slate-200 pb-3 text-xs font-semibold text-slate-600">{label}<div className="mt-1">{children}</div></label>; }
function Empty({ text }: { text: string }) { return <p className="p-3 text-center text-xs text-slate-400">{text}</p>; }
function TaskEditor({ tasks, setTasks, updateTask, minFixedDate }: { tasks: PlanTaskInput[]; setTasks: React.Dispatch<React.SetStateAction<PlanTaskInput[]>>; updateTask: (index: number, update: Partial<PlanTaskInput>) => void; minFixedDate?: string }) { return <section className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-gray-800">Additional tasks</h3><p className="text-xs font-normal text-gray-400">Photos are attached to their specific task</p></div><button type="button" onClick={() => setTasks((items) => [...items, newTask()])} className="flex items-center gap-1 rounded bg-sky-500 px-3 py-2 text-xs font-semibold text-white"><TbPlus/> Add task</button></div>{!tasks.length && <Empty text="No additional tasks"/>}{tasks.map((task, taskIndex) => <div key={taskIndex} className="space-y-3 rounded border border-gray-200 bg-white p-3"><div className="flex items-center justify-between"><strong className="text-xs text-gray-600">Task {taskIndex + 1}</strong><button type="button" onClick={() => setTasks((items) => items.filter((_, index) => index !== taskIndex))} className="rounded border border-gray-200 p-2 text-red-500"><TbTrash/></button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Task name *"><input required value={task.name} onChange={(event) => updateTask(taskIndex, { name: event.target.value })} className={controlClass}/></Field><Field label="Schedule type *"><Select value={task.schedule_type ?? "recurring"} onValueChange={(value) => updateTask(taskIndex, { schedule_type: value as PlanTaskInput["schedule_type"], ...(value === "recurring" ? { fixed_date: undefined } : {}) })} options={[{ value: "recurring", label: "Recurring (every visit)" }, { value: "fixed_date", label: "Fixed date (one-time)" }]}/></Field></div><div className={`grid gap-3 ${task.schedule_type === "fixed_date" ? "sm:grid-cols-2" : ""}`}>{task.schedule_type === "fixed_date" && <Field label="Fixed date *"><DatePicker value={task.fixed_date ?? ""} onValueChange={(value) => updateTask(taskIndex, { fixed_date: value })} min={minFixedDate}/></Field>}<Field label="Duration (min)"><input type="number" min={0} value={task.duration_minutes ?? ""} onChange={(event) => updateTask(taskIndex, { duration_minutes: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="e.g. 10" className={controlClass}/></Field></div><label className="flex items-center gap-2 text-xs font-semibold text-gray-700"><input type="checkbox" checked={task.is_photo_req} onChange={(event) => updateTask(taskIndex, { is_photo_req: event.target.checked, photo: event.target.checked ? [{ name: "" }] : [] })}/> Photo required</label>{task.is_photo_req && <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3"><p className="text-xs font-semibold text-gray-600">Required photos</p>{task.photo.map((photo, photoIndex) => <div key={photoIndex} className="flex gap-2"><input required value={photo.name} onChange={(event) => updateTask(taskIndex, { photo: task.photo.map((item, index) => index === photoIndex ? { ...item, name: event.target.value } : item) })} placeholder="Photo name" className={controlClass}/><button type="button" onClick={() => updateTask(taskIndex, { photo: task.photo.filter((_, index) => index !== photoIndex) })} className="rounded border border-gray-300 px-3 text-red-500"><TbTrash/></button></div>)}<button type="button" onClick={() => updateTask(taskIndex, { is_photo_req: true, photo: [...task.photo, { name: "" }] })} className="flex items-center gap-1 text-xs font-semibold text-sky-600"><TbPlus/> Add photo</button></div>}</div>)}</section>; }
