// Medicines Service using Supabase
import { supabase } from './supabaseClient.js';
import { sendBroadcastNotification } from './notificationsService.js';

// Function to get all medicines from Supabase
export async function getMedicines() {
    try {
        const { data, error } = await supabase
            .from('medicines')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching medicines:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error fetching medicines:', error);
        return [];
    }
}

// Function to add a new medicine to Supabase
export async function addMedicine(medicine) {
    try {
        const { data, error } = await supabase
            .from('medicines')
            .insert([medicine])
            .select();

        if (error) {
            console.error('Error adding medicine:', error);
            return null;
        }

        const addedMedicine = data && data[0] ? data[0] : null;
        
        // Send notification about new medicine
        if (addedMedicine) {
            try {
                await sendBroadcastNotification(
                    'New Medicine Added', 
                    `A new medicine "${addedMedicine.name}" has been added to the inventory.`
                );
            } catch (notificationError) {
                console.error('Error sending notification for new medicine:', notificationError);
            }
        }
        
        return addedMedicine;
    } catch (error) {
        console.error('Unexpected error adding medicine:', error);
        return null;
    }
}

// Function to update an existing medicine in Supabase
export async function updateMedicine(id, updates) {
    try {
        // Get the medicine before update to have its original values
        const { data: originalMedicine, error: fetchError } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.error('Error fetching original medicine:', fetchError);
            return null;
        }
        
        const { data, error } = await supabase
            .from('medicines')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating medicine:', error);
            return null;
        }

        const updatedMedicine = data && data[0] ? data[0] : null;
        
        return updatedMedicine;
    } catch (error) {
        console.error('Unexpected error updating medicine:', error);
        return null;
    }
}

// Function to delete a medicine from Supabase
export async function deleteMedicine(id) {
    try {
        // Get the medicine before deletion to have its details for notification
        const { data: deletedMedicine, error: fetchError } = await supabase
            .from('medicines')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.error('Error fetching medicine before deletion:', fetchError);
        }
        
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting medicine:', error);
            return false;
        }
        
        // Send notification about deleted medicine
        if (deletedMedicine) {
            try {
                await sendBroadcastNotification(
                    'Medicine Removed', 
                    `The medicine "${deletedMedicine.name}" has been removed from the inventory.`
                );
            } catch (notificationError) {
                console.error('Error sending notification for deleted medicine:', notificationError);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Unexpected error deleting medicine:', error);
        return false;
    }
}