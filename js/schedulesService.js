// Schedules Service using Supabase
import { supabase } from './supabaseClient.js';
import { sendBroadcastNotification } from './notificationsService.js';

// Function to get all schedules from Supabase
export async function getSchedules() {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .select('*')
            .order('title', { ascending: true });

        if (error) {
            console.error('Error fetching schedules:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error fetching schedules:', error);
        return [];
    }
}

// Function to add a new schedule to Supabase
export async function addSchedule(schedule) {
    try {
        const { data, error } = await supabase
            .from('schedules')
            .insert([schedule])
            .select();

        if (error) {
            console.error('Error adding schedule:', error);
            return null;
        }

        const addedSchedule = data && data[0] ? data[0] : null;
        
        // Send notification about new schedule
        if (addedSchedule) {
            try {
                await sendBroadcastNotification(
                    'New Schedule Added', 
                    `A new schedule "${addedSchedule.title}" with ${addedSchedule.doctor} has been added.`
                );
            } catch (notificationError) {
                console.error('Error sending notification for new schedule:', notificationError);
            }
        }
        
        return addedSchedule;
    } catch (error) {
        console.error('Unexpected error adding schedule:', error);
        return null;
    }
}

// Function to update an existing schedule in Supabase
export async function updateSchedule(id, updates) {
    try {
        // Get the schedule before update to have its original values
        const { data: originalSchedule, error: fetchError } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.error('Error fetching original schedule:', fetchError);
            return null;
        }
        
        const { data, error } = await supabase
            .from('schedules')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating schedule:', error);
            return null;
        }

        const updatedSchedule = data && data[0] ? data[0] : null;
        
        // Check if status changed and send notification if it did
        if (updatedSchedule && originalSchedule && originalSchedule.status !== updatedSchedule.status) {
            try {
                const notificationMessage = `The schedule "${updatedSchedule.title}" with ${updatedSchedule.doctor} is now ${updatedSchedule.status.toLowerCase()}.`;
                
                await sendBroadcastNotification(
                    'Schedule Status Updated', 
                    notificationMessage
                );
                
                // Send a specific notification if the schedule became unavailable
                if (updatedSchedule.status === 'Unavailable') {
                    await sendBroadcastNotification(
                        'Service Unavailable', 
                        `Important: The service "${updatedSchedule.title}" with ${updatedSchedule.doctor} is now unavailable.`
                    );
                }
            } catch (notificationError) {
                console.error('Error sending notification for updated schedule:', notificationError);
            }
        }
        
        return updatedSchedule;
    } catch (error) {
        console.error('Unexpected error updating schedule:', error);
        return null;
    }
}

// Function to delete a schedule from Supabase
export async function deleteSchedule(id) {
    try {
        // Get the schedule before deletion to have its details for notification
        const { data: deletedSchedule, error: fetchError } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.error('Error fetching schedule before deletion:', fetchError);
        }
        
        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting schedule:', error);
            return false;
        }
        
        // Send notification about deleted schedule
        if (deletedSchedule) {
            try {
                await sendBroadcastNotification(
                    'Schedule Removed', 
                    `The schedule "${deletedSchedule.title}" with ${deletedSchedule.doctor} has been removed.`
                );
            } catch (notificationError) {
                console.error('Error sending notification for deleted schedule:', notificationError);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Unexpected error deleting schedule:', error);
        return false;
    }
}