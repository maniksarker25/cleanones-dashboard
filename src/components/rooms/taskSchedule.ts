export const WEEKDAYS = [
    { value: "mon", label: "Mon" },
    { value: "tue", label: "Tue" },
    { value: "wed", label: "Wed" },
    { value: "thu", label: "Thu" },
    { value: "fri", label: "Fri" },
    { value: "sat", label: "Sat" },
    { value: "sun", label: "Sun" },
];

export const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const frequencyLabel = (value?: string) => {
    switch (value) {
        case "daily": return "Daily";
        case "weekly": return "Weekly";
        case "monthly": return "Monthly";
        // Legacy values from before the daily/weekly/monthly-only model — still rendered if
        // older data has them, just no longer offered when creating/editing a task.
        case "every_visit": return "Every visit";
        case "biweekly": return "Biweekly";
        case "yearly": return "Yearly";
        default: return value || "Daily";
    }
};

/** Short human summary of a task's schedule, e.g. "Weekly: Mon, Wed" or "Monthly: 1, 15". */
export const scheduleSummary = (task: { frequency_type?: string; days_of_week?: string[]; days_of_month?: number[] }): string => {
    if (task.frequency_type === "weekly" && task.days_of_week?.length) {
        const order = WEEKDAYS.map((d) => d.value);
        const labels = task.days_of_week
            .slice()
            .sort((a, b) => order.indexOf(a) - order.indexOf(b))
            .map((v) => WEEKDAYS.find((d) => d.value === v)?.label ?? v);
        return `Weekly: ${labels.join(", ")}`;
    }
    if (task.frequency_type === "monthly" && task.days_of_month?.length) {
        return `Monthly: ${task.days_of_month.slice().sort((a, b) => a - b).join(", ")}`;
    }
    return frequencyLabel(task.frequency_type);
};
