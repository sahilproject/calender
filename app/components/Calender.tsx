"use client";
import React, { useEffect, useState } from "react";
import FullCalendar, {
  DateClickArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Box,
  Typography,
  Tooltip,
} from "@mui/material";
import { HexColorPicker } from "react-colorful";
import { supabase } from "@/lib/supabaseClient";

const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${formattedHours}.${formattedMinutes}${ampm}`;
};

interface EventData {
  id?: string;
  title: string;
  image?: string;
  start: string;
  end: string;
  backgroundColor: string;
}

interface FormData {
  title: string;
  image: string;
  imageFile: File | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  color: string;
}

const MyCalendar: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    image: "",
    imageFile: null,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    color: "#FF0000",
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*");
    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data as EventData[]);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    const clickedDate = new Date(arg.dateStr);
    const isoDate = clickedDate.toISOString().split("T")[0];
    const time = clickedDate.toTimeString().slice(0, 5);

    setFormData({
      title: "",
      image: "",
      imageFile: null,
      startDate: isoDate,
      startTime: time,
      endDate: isoDate,
      endTime: time,
      color: "#FF0000",
    });
    setSelectedEventId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const start = new Date(info.event.start!);
    const end = new Date(info.event.end!);

    setSelectedEventId(info.event.id);

    setFormData({
      title: info.event.title,
      image: (info.event.extendedProps as any).image || "",
      imageFile: null,
      startDate: start.toISOString().split("T")[0],
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split("T")[0],
      endTime: end.toTimeString().slice(0, 5),
      color: info.event.backgroundColor || "#FF0000",
    });

    setIsModalOpen(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from("event-images")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = await supabase.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleFormSubmit = async () => {
    const { title, imageFile, startDate, startTime, endDate, endTime, color } =
      formData;
    const start = `${startDate}T${startTime}`;
    const end = `${endDate}T${endTime}`;

    let uploadedImageUrl = formData.image;

    if (imageFile) {
      try {
        uploadedImageUrl = await uploadImage(imageFile);
      } catch (err) {
        console.error("Image upload failed:", err);
        return;
      }
    }

    const eventData: EventData = {
      title,
      image: uploadedImageUrl,
      start,
      end,
      backgroundColor: color,
    };

    if (selectedEventId) {
      eventData.id = selectedEventId;
    }

    const { error } = await supabase.from("events").upsert([eventData]);

    if (error) {
      console.error("Error saving event:", error);
    } else {
      fetchEvents();
      setIsModalOpen(false);
      setSelectedEventId(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", selectedEventId);

    if (error) {
      console.error("Error deleting event:", error);
    } else {
      fetchEvents();
      setIsModalOpen(false);
      setSelectedEventId(null);
    }
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        eventContent={(eventInfo: EventContentArg) => (
          <Tooltip
            title={
              <Box>
                {(eventInfo.event.extendedProps as any).image && (
                  <img
                    src={(eventInfo.event.extendedProps as any).image}
                    alt="Event Image"
                    style={{ width: "150px", height: "auto" }}
                  />
                )}
                <Typography variant="body2" color="textSecondary">
                  {eventInfo.event.start?.toLocaleString()} -{" "}
                  {eventInfo.event.end?.toLocaleString()}
                </Typography>
              </Box>
            }
          >
            <div
              style={{
                backgroundColor: "#d4f8d4",
                padding: "6px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#1a1a1a",
                cursor: "pointer",
              }}
            >
              <div>{eventInfo.event.title}</div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "normal",
                  marginTop: "2px",
                }}
              >
                {formatTime(eventInfo.event.start!)} -{" "}
                {formatTime(eventInfo.event.end!)}
              </div>
            </div>
          </Tooltip>
        )}
        height="auto"
        contentHeight="auto"
        aspectRatio={1.5}
      />

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedEventId ? "Edit Event" : "Add Event"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            margin="dense"
          />

          <Box mt={2}>
            <Typography variant="body2" fontWeight={500}>
              Upload Image:
            </Typography>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFormData({ ...formData, imageFile: e.target.files?.[0] || null })
              }
            />
            {formData.image && (
              <Box mt={1}>
                <img
                  src={formData.image}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover" }}
                />
              </Box>
            )}
          </Box>

          <TextField
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />

          <Box mt={2}>
            <Typography variant="body2" fontWeight={500}>
              Pick Color:
            </Typography>
            <HexColorPicker
              color={formData.color}
              onChange={(newColor: string) =>
                setFormData({ ...formData, color: newColor })
              }
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)} color="secondary">
            Cancel
          </Button>
          {selectedEventId && (
            <Button onClick={handleDeleteEvent} color="error">
              Delete
            </Button>
          )}
          <Button onClick={handleFormSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyCalendar;
