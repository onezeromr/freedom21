/*
  # Add INSERT policy for profiles table

  1. Security Changes
    - Add policy to allow authenticated users to insert their own profile data
    - This resolves the "new row violates row-level security policy" error
    - Users can now create their profile when signing up or signing in

  2. Policy Details
    - Target: authenticated users only
    - Condition: user can only insert a profile where the ID matches their auth.uid()
    - This ensures users can only create profiles for themselves
*/

-- Add INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);